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
      description: 'Upload your photograph',
      options: {
        hotspot: true,
      },
      validation: (Rule) => Rule.required(),
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text (optional)',
          type: 'string',
        }),
      ],
    }),
  ],
  preview: {
    select: {
      media: 'image',
    },
    prepare({media}) {
      return {
        title: 'Photo',
        media,
      }
    },
  },
})
