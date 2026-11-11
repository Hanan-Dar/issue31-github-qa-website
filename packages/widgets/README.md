# @craeft/widgets

How this site's widgets choose what they show: the sections set up from the site's own content
(posts, pictures in albums, testimonials), rather than typed. Which items a section shows and in what
order (`src/posts.ts`, `src/gallery.ts`, `src/testimonials.ts`), the settings a section may have
(`src/options.ts`), and how carousels, "Load more", filter buttons and the gallery's lightbox behave in
the browser (`src/client/`) are decided here; how they look is decided by the theme
(`packages/theme`).

Craeft keeps this folder up to date: a new version arrives as a pull request. Change the look in the
theme, not here, or the next update will undo it. MIT licensed (LICENSE): the site keeps working
without Craeft.
