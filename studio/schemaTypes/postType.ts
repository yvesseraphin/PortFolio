import {defineType, defineField, defineArrayMember} from 'sanity'

// ─── Reference item (used in the References/Resources section) ───
export const referenceItemType = defineType({
  name: 'referenceItem',
  title: 'Reference',
  type: 'object',
  fields: [
    defineField({
      name: 'text',
      title: 'Citation text',
      type: 'string',
      description: 'e.g. "E. Goodman. Understanding Interaction Design Practices (2011)"',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      description: 'Optional link for the citation',
    }),
  ],
  preview: {
    select: {title: 'text'},
  },
})

// ─── Post ────────────────────────────────────────────────────────
export const postType = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    // ── Identity ──────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'postDate',
      title: 'Published date',
      type: 'date',
      options: {dateFormat: 'YYYY-MM-DD'},
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: 'Used for meta description and post list cards',
    }),

    // ── Media ──────────────────────────────────────────────────
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'aspectRatio',
      title: 'Cover aspect ratio (width / height)',
      type: 'number',
      description: 'e.g. 1.4 for landscape, 0.75 for portrait. Used in the blog grid.',
      initialValue: 1.4,
    }),

    // ── Body ───────────────────────────────────────────────────
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        // ── Paragraph / inline content ──
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Heading', value: 'h2'},
            {title: 'Sub-heading', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          marks: {
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Emphasis', value: 'em'},
              {title: 'Code', value: 'code'},
            ],
            annotations: [
              defineArrayMember({
                type: 'object',
                name: 'link',
                title: 'Link',
                fields: [
                  defineField({
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                    validation: (R) =>
                      R.uri({allowRelative: true, scheme: ['http', 'https', 'mailto']}),
                  }),
                ],
              }),
            ],
          },
        }),
        // ── Images ──
        defineArrayMember({
          type: 'image',
          title: 'Image',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'alt',
              type: 'string',
              title: 'Alt text',
            }),
            defineField({
              name: 'caption',
              type: 'string',
              title: 'Caption',
            }),
          ],
        }),
        // ── Code blocks ──
        defineArrayMember({
          type: 'object',
          name: 'codeBlock',
          title: 'Code block',
          fields: [
            defineField({
              name: 'language',
              title: 'Language',
              type: 'string',
              options: {
                list: [
                  {title: 'JavaScript / JSX', value: 'jsx'},
                  {title: 'TypeScript / TSX', value: 'tsx'},
                  {title: 'CSS', value: 'css'},
                  {title: 'HTML', value: 'html'},
                  {title: 'Bash / Shell', value: 'bash'},
                  {title: 'JSON', value: 'json'},
                  {title: 'Python', value: 'python'},
                  {title: 'Plain text', value: 'code'},
                ],
              },
              initialValue: 'tsx',
            }),
            defineField({
              name: 'code',
              title: 'Code',
              type: 'text',
              rows: 12,
            }),
            defineField({
              name: 'highlightedLines',
              title: 'Highlighted line numbers (comma-separated)',
              type: 'string',
              description: 'e.g. "3,5,7" — those lines get a blue background',
            }),
          ],
          preview: {
            select: {language: 'language', code: 'code'},
            prepare({language, code}: {language?: string; code?: string}) {
              return {
                title: `[${language || 'code'}] ${(code || '').substring(0, 60)}`,
              }
            },
          },
        }),
      ],
    }),

    // ── References / Resources ─────────────────────────────────
    defineField({
      name: 'referencesHeading',
      title: 'References section heading',
      type: 'string',
      initialValue: 'References',
      description: 'Defaults to "References". Change to "Resources" etc. if needed.',
    }),
    defineField({
      name: 'references',
      title: 'References',
      type: 'array',
      of: [defineArrayMember({type: 'referenceItem'})],
      description: 'Numbered citations shown at the bottom of the post.',
    }),
  ],

  preview: {
    select: {
      title: 'title',
      date: 'postDate',
      media: 'coverImage',
    },
    prepare({title, date, media}: {title?: string; date?: string; media?: unknown}) {
      return {
        title: title || 'Untitled',
        subtitle: date || '',
        media,
      }
    },
  },
  orderings: [
    {
      title: 'Newest first',
      name: 'postDateDesc',
      by: [{field: 'postDate', direction: 'desc'}],
    },
  ],
})
