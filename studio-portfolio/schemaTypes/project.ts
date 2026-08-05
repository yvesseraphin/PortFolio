import {defineField, defineType} from 'sanity'

export const projectType = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      description: 'Short summary shown on the projects grid.',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'url',
      title: 'External URL',
      description: 'Link to the live project or repo. Leave empty for an internal detail page.',
      type: 'url',
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      description: 'Thumbnail shown on the projects grid.',
      type: 'image',
      options: {hotspot: true, metadata: ['blurhash', 'lqip']},
    }),
    defineField({
      name: 'aspectRatio',
      title: 'Aspect Ratio Override',
      type: 'number',
      description:
        'Card widthÃ·height (e.g. 1.6 = landscape, 1.0 = square, 0.8 = portrait). Leave empty â€” auto from cover image.',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      description: 'e.g. "React", "TypeScript", "Machine Learning"',
      type: 'array',
      of: [{type: 'string'}],
      options: {layout: 'tags'},
    }),
  ],

  orderings: [
    {
      title: 'Newest first',
      name: 'publishedAtDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
  ],

  preview: {
    select: {title: 'title', media: 'coverImage', subtitle: 'publishedAt'},
  },
})
