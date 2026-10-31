import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table'

const meta = {
  title: 'UI/Table',
  component: Table,
  args: {},
  render: (args) => (
    <Table {...args}>
      <TableCaption>Recent brews</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Coffee</TableHead>
          <TableHead>Dose</TableHead>
          <TableHead>Yield</TableHead>
          <TableHead>Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {['Ethiopia Guji', 'Colombia Huila', 'Brazil Cerrado'].map((name) => (
          <TableRow key={name}>
            <TableCell>{name}</TableCell>
            <TableCell>18 g</TableCell>
            <TableCell>36 g</TableCell>
            <TableCell>28 s</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
} satisfies Meta<typeof Table>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
