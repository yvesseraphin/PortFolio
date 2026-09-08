import {defineType, defineField} from 'sanity'

export const photoType = defineType({
  name: 'photo',
  title: 'Photo',
  type: 'document',
  fields: [
    defineField({
      name: 'image',
      title: 'Photo Image',
      type: 'image',
      description: 'Upload your photograph here',
      options: {
        hotspot: true,
        metadata: ['blurhash', 'lqip', 'palette'],
      },
      validation: (Rule) => Rule.required(),
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text (optional)',
          type: 'string',
          description: 'Optional description for screen readers and SEO',
        }),
      ],
    }),
  ],
  preview: {
    select: {
      media: 'image',
      createdAt: '_createdAt',
    },
    prepare(selection) {
      const {media, createdAt} = selection
      const dateStr = createdAt ? new Date(createdAt).toLocaleDateString() : ''
      return {
        title: 'Photo',
        subtitle: dateStr ? `Uploaded: ${dateStr}` : '',
        media,
      }
    },
  },
})
