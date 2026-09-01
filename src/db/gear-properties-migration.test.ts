import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

describe('gear property migration', () => {
  let client: PGlite

  beforeAll(async () => {
    client = await PGlite.create('memory://')
    const migrationDirectory = resolve('drizzle')
    const migrationFiles = (await readdir(migrationDirectory))
      .filter((filename) => filename.endsWith('.sql') && filename < '0043_')
      .sort()

    for (const filename of migrationFiles) {
      const sql = await readFile(resolve(migrationDirectory, filename), 'utf8')
      await client.exec(sql.replaceAll('--> statement-breakpoint', ''))
    }

    await client.exec(`
      insert into gear (id, name, type) values
        (9001, 'Legacy manual', 'espresso_machine'),
        (9002, 'Legacy weight', 'espresso_machine'),
        (9003, 'Legacy unknown', 'espresso_machine'),
        (9004, 'Legacy time', 'espresso_machine'),
        (9005, 'Legacy volume', 'espresso_machine');

      insert into machine_settings (
        gear_id,
        brew_pressure_opv_bar,
        supports_preinfusion,
        default_preinfusion_enabled,
        default_preinfusion_time_seconds,
        default_preinfusion_pressure_bar,
        default_flow_limit_ml_per_second,
        temperature_offset_celsius,
        volumetric_shot_volume_ml,
        auto_stop_mode,
        steam_temperature_celsius,
        steam_pressure_bar
      ) values
        (9001, 9, false, false, 0, 0, 0, -1.5, 30, 'manual', 130, 1.5),
        (9002, null, true, null, null, null, null, null, null, 'weight', null, null),
        (9003, null, null, null, null, null, null, null, null, null, null, null),
        (9004, null, true, null, null, null, null, null, null, 'time', null, null),
        (9005, null, true, null, null, null, null, null, null, 'volume', null, null);
    `)

    const migration = await readFile(
      resolve(migrationDirectory, '0043_rainy_sister_grimm.sql'),
      'utf8',
    )
    await client.exec(migration.replaceAll('--> statement-breakpoint', ''))
  }, 20_000)

  afterAll(async () => {
    await client.close()
    process.exitCode = 0
  })

  test('maps legacy capabilities and every stop mode', async () => {
    const result = await client.query<{
      gear_id: number
      preinfusion_control: string | null
      shot_stop_modes: string[] | null
    }>(`
      select gear_id, preinfusion_control, shot_stop_modes
      from espresso_machine_details
      order by gear_id
    `)

    expect(result.rows).toEqual([
      {
        gear_id: 9001,
        preinfusion_control: 'none',
        shot_stop_modes: ['manual'],
      },
      {
        gear_id: 9002,
        preinfusion_control: 'supported',
        shot_stop_modes: ['weight'],
      },
      {
        gear_id: 9003,
        preinfusion_control: null,
        shot_stop_modes: null,
      },
      {
        gear_id: 9004,
        preinfusion_control: 'supported',
        shot_stop_modes: ['time'],
      },
      {
        gear_id: 9005,
        preinfusion_control: 'supported',
        shot_stop_modes: ['volume'],
      },
    ])
  })

  test('copies every legacy setting into an owner revision without losing zero or signed values', async () => {
    const result = await client.query<{
      kind: string
      brew_pressure_bar: string | null
      preinfusion_enabled: boolean | null
      preinfusion_time_seconds: string | null
      preinfusion_pressure_bar: string | null
      flow_limit_ml_per_second: string | null
      brew_temperature_offset_celsius: string | null
      programmed_volume_ml: string | null
      default_stop_mode: string | null
      steam_temperature_celsius: string | null
      steam_pressure_bar: string | null
    }>(`
      select
        kind,
        brew_pressure_bar,
        preinfusion_enabled,
        preinfusion_time_seconds,
        preinfusion_pressure_bar,
        flow_limit_ml_per_second,
        brew_temperature_offset_celsius,
        programmed_volume_ml,
        default_stop_mode,
        steam_temperature_celsius,
        steam_pressure_bar
      from espresso_machine_setting_revisions
      where gear_id = 9001
    `)

    expect(result.rows).toEqual([
      {
        kind: 'owner',
        brew_pressure_bar: '9.00',
        preinfusion_enabled: false,
        preinfusion_time_seconds: '0.00',
        preinfusion_pressure_bar: '0.00',
        flow_limit_ml_per_second: '0.00',
        brew_temperature_offset_celsius: '-1.5',
        programmed_volume_ml: '30.00',
        default_stop_mode: 'manual',
        steam_temperature_celsius: '130.0',
        steam_pressure_bar: '1.50',
      },
    ])
  })

  test('keeps every tamper property nullable', async () => {
    await client.exec(`
      insert into gear (id, name, type)
      values (9010, 'Unknown tamper', 'tamper');
      insert into tamper_details (gear_id) values (9010);
    `)
    const result = await client.query<{
      diameter_mm: string | null
      force_control: string | null
      base_shape: string | null
      self_leveling: boolean | null
    }>(`
      select diameter_mm, force_control, base_shape, self_leveling
      from tamper_details where gear_id = 9010
    `)

    expect(result.rows).toEqual([
      {
        diameter_mm: null,
        force_control: null,
        base_shape: null,
        self_leveling: null,
      },
    ])
  })

  test('enforces subtype compatibility while allowing combined machines', async () => {
    await client.exec(`
      insert into gear (id, name, type)
      values (9020, 'Combined machine', 'espresso_machine_with_grinder');
      insert into espresso_machine_details (gear_id) values (9020);
      insert into grinder_details (gear_id) values (9020);
    `)

    await expect(
      client.exec(`
        insert into gear (id, name, type)
        values (9021, 'Wrong subtype', 'scale');
        insert into tamper_details (gear_id) values (9021);
      `),
    ).rejects.toMatchObject({
      code: '23514',
      constraint: 'gear_subtype_compatibility_check',
    })
  })

  test('allows an atomic type change after incompatible details are removed', async () => {
    await client.exec(`
      insert into gear (id, name, type)
      values (9030, 'Changing type', 'tamper');
      insert into tamper_details (gear_id, self_leveling)
      values (9030, false);

      begin;
      update gear set type = 'scale' where id = 9030;
      delete from tamper_details where gear_id = 9030;
      insert into scale_details (gear_id, has_timer) values (9030, true);
      commit;
    `)
    const result = await client.query<{ type: string; has_timer: boolean }>(`
      select gear.type, scale_details.has_timer
      from gear
      join scale_details on scale_details.gear_id = gear.id
      where gear.id = 9030
    `)

    expect(result.rows).toEqual([{ type: 'scale', has_timer: true }])
  })
})
