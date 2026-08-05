import {defineField, defineType, defineArrayMember} from 'sanity'

export const postType = defineType({
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  fields: [
    // â”€â”€ Meta â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      description: 'Short summary shown on blog grid cards.',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      description: 'Used as the blog grid card thumbnail.',
      type: 'image',
      options: {hotspot: true, metadata: ['blurhash', 'lqip']},
    }),
    defineField({
      name: 'aspectRatio',
      title: 'Aspect Ratio Override',
      type: 'number',
      description: 'Card widthÃ·height (e.g. 1.6 = landscape, 1.0 = square, 0.8 = portrait). Leave empty â€” auto from cover image.',
    }),

    // â”€â”€ Body â€” structured sections â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Each item in this array is one "section" of the post.
    // Sections appear top-to-bottom exactly as ordered here.
    // The table of contents is auto-generated from section headings.
    defineField({
      name: 'sections',
      title: 'Sections',
      description: 'Add sections one by one. Each section = a heading + its content blocks in order.',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'section',
          title: 'Section',
          type: 'object',
          // Preview shows the section heading in the Studio list
          preview: {
            select: {title: 'heading'},
            prepare: ({title}) => ({title: title || 'Untitled section'}),
          },
          fields: [
            defineField({
              name: 'heading',
              title: 'Section Heading',
              description: 'Becomes a table-of-contents entry. Leave empty for an intro section with no heading.',
              type: 'string',
            }),
            defineField({
              name: 'content',
              title: 'Content',
              description: 'Add blocks in order: paragraphs, images, videos. Mix freely.',
              type: 'array',
              of: [
                // â”€â”€ Text paragraph â”€â”€
                defineArrayMember({type: 'block'}),

                // â”€â”€ Image â”€â”€
                defineArrayMember({
                  name: 'postImage',
                  title: 'Image',
                  type: 'image',
                  options: {hotspot: true, metadata: ['blurhash', 'lqip']},
                  fields: [
                    defineField({
                      name: 'alt',
                      title: 'Alt text',
                      type: 'string',
                      description: 'Describe the image for accessibility.',
                    }),
                    defineField({
                      name: 'caption',
                      title: 'Caption',
                      type: 'string',
                      description: 'Optional caption shown below the image.',
                    }),
                  ],
                }),

                // â”€â”€ Video (external URL â€” YouTube, Vimeo, mp4) â”€â”€
                defineArrayMember({
                  name: 'postVideo',
                  title: 'Video',
                  type: 'object',
                  preview: {
                    select: {title: 'caption', subtitle: 'url'},
                    prepare: ({title, subtitle}) => ({title: title || 'Video', subtitle}),
                  },
                  fields: [
                    defineField({
                      name: 'url',
                      title: 'Video URL',
                      type: 'url',
                      description: 'Direct .mp4 link or YouTube/Vimeo URL.',
                      validation: (r) => r.required(),
                    }),
                    defineField({
                      name: 'caption',
                      title: 'Caption',
                      type: 'string',
                    }),
                    defineField({
                      name: 'autoplay',
                      title: 'Autoplay + loop (for silent demo clips)',
                      type: 'boolean',
                      initialValue: true,
                    }),
                  ],
                }),

                // â”€â”€ Divider line (like the hr between sections) â”€â”€
                defineArrayMember({
                  name: 'divider',
                  title: 'Divider',
                  type: 'object',
                  preview: {prepare: () => ({title: 'â”€â”€ Divider â”€â”€'})},
                  fields: [
                    defineField({
                      name: '_key',
                      type: 'string',
                      hidden: true,
                      initialValue: () => Math.random().toString(36).slice(2),
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
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

