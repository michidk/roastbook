import type { Meta, StoryObj } from '@storybook/react-vite'
import { useRef, useState } from 'react'
import { fn } from 'storybook/test'
import type { ImageFile } from '@/lib/image-file'
import { PictureUploader } from './picture-uploader'

const meta = {
  title: 'Media/Picture uploader',
  component: PictureUploader,
  args: {
    images: [],
    fileInputRef: { current: null },
    onFilesAdded: fn(async () => []),
    onImportFromUrl: fn(async () => {
      throw new Error(
        'This picture URL is unavailable. Choose a local file instead.',
      )
    }),
    onRemoveImage: fn(),
    onOpenFilePicker: fn(),
    prompt: 'Add pictures of your coffee',
    previewAltPrefix: 'Coffee',
    helperText: 'Drop pictures, paste from the clipboard, or import a URL.',
  },

  render: function Interactive(args) {
    const [images, setImages] = useState<readonly ImageFile[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    return (
      <PictureUploader
        {...args}
        images={images}
        fileInputRef={fileInputRef}
        onOpenFilePicker={() => fileInputRef.current?.click()}
        onFilesAdded={async (files) => {
          const added = await Promise.all(
            files.map(
              (file) =>
                new Promise<ImageFile>((resolve, reject) => {
                  const reader = new FileReader()
                  reader.onload = () => {
                    if (typeof reader.result !== 'string') {
                      reject(new Error('Could not read image.'))
                      return
                    }
                    resolve({
                      file,
                      preview: reader.result,
                      base64: reader.result.split(',')[1] ?? '',
                    })
                  }
                  reader.onerror = () =>
                    reject(new Error('Could not read image.'))
                  reader.readAsDataURL(file)
                }),
            ),
          )
          setImages((current) => [...current, ...added])
          args.onFilesAdded(files)
          return added
        }}
        onRemoveImage={(index) => {
          setImages((current) => current.filter((_, i) => i !== index))
          args.onRemoveImage(index)
        }}
      />
    )
  },
  argTypes: { images: { control: false }, fileInputRef: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Choose, drop, or paste local images to preview and remove them in memory. Nothing is uploaded. URL import demonstrates an unavailable-image error without calling a server.',
      },
    },
  },
} satisfies Meta<typeof PictureUploader>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Busy: Story = {
  args: { isBusy: true, statusText: 'Analyzing pictures…' },
}
