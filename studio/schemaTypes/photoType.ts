import {defineType, defineField} from 'sanity'

export const photoType = defineType({
  name: 'photo',
  title: 'Photo',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title / Caption',
      type: 'string',
      description: 'Short title or description for this photo',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      description: 'Upload your custom photograph',
      options: {
        hotspot: true,
        metadata: ['blurhash', 'lqip', 'palette'],
      },
      validation: (Rule) => Rule.required(),
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          description: 'Description for accessibility and SEO',
        }),
      ],
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Lower numbers appear first (e.g. 1, 2, 3...)',
      initialValue: 1,
    }),
    defineField({
      name: 'date',
      title: 'Date Taken',
      type: 'date',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'image',
      subtitle: 'date',
    },
    prepare(selection) {
      const {title, media, subtitle} = selection
      return {
        title: title || 'Untitled Photo',
        subtitle: subtitle || '',
        media,
      }
    },
  },
})
