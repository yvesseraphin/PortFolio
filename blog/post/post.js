/* ============================================================
   POST.JS — Fetches a single blog post from Hygraph and renders
   it into the existing UI shell of blog/post/index.html.

   URL format:  /blog/post/?slug=my-post-slug
   ============================================================ */
(function () {
  "use strict";

  /* ── Hygraph config ────────────────────────────────────── */
  var HYGRAPH_ENDPOINT = "https://eu-west-2.cdn.hygraph.com/content/cms96wuqa009e07uugpyxsqs7/master";
  var HYGRAPH_TOKEN    = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImdjbXMtbWFpbi1wcm9kdWN0aW9uIn0.eyJ2ZXJzaW9uIjozLCJpYXQiOjE3ODU5NzY3ODgsImF1ZCI6WyJodHRwczovL2FwaS1ldS13ZXN0LTIuaHlncmFwaC5jb20vdjIvY21zOTZ3dXFhMDA5ZTA3dXVncHl4c3FzNy9tYXN0ZXIiLCJtYW5hZ2VtZW50LW5leHQuZ3JhcGhjbXMuY29tIl0sImlzcyI6Imh0dHBzOi8vbWFuYWdlbWVudC1ldS13ZXN0LTIuaHlncmFwaC5jb20vIiwic3ViIjoiMGE4MWZiZTEtNWQ2OS00NTlhLWI1OWEtOWE0NjVlZDMxZTFkIiwianRpIjoiY21zZ3NndHB6MG84dzA3bW9kc2ZlZDQyMiJ9.QfZ5aFKj3rE-m77VOd_EZ0X54CW74yizyS7e2G30HSfXOlSrfs86CWPpMpzIyGu0af_HHPaJ8gSx7o31RLU66ldZNakjFEuqPKiKgRnnj1hu8m6iWq724rfCKJPfuakOhD1_KS2Dj2h2bL4h7T6p9Bqc98mr856jjaWFVtahkpTVMvL98SJfeuR1ZzlZyEiuczmxeS_g1H0iEk-cMgI7knXF2uj7G_Eizclgh4HrBph-uMdJOycZOfYWY3klCxGPHVGusSfkJfvc3Z2FFjbbw1t23NgWGGHtW4ckXwqJZNyxcfjZiq4RRU4X0MU-rC_BjLqfO9b1fgMVfiZpPRVnrGSbOOU491CQHwEFgagcabc9MmEkOYqg6ofrg3J0NTfsV2KHThZWKyv8K4yiBKf5ayjbDXpIpQVeE_Domr9MHyblyFEh1nlmZGqJgb5n9CgPzRFbBDgehfa61b_Jnc2eeA18AMaxzO_RpX4vdc8ud96VfGiVqmxfpYzDngFo5X4Z0OsI-p_-j3-huWeX24AcDjF3PegERCILhPkv0DHUnJLWXDWAL0RZBH4UjyXixaWawMDUzVGqqLTTRYQLYiJafFmbyshmdGIDOsMH4w_AIMOYZQbceviGYjEL0-CfuJ0MC46O-lmcL9mYgc-2J6lsbdjetu7lZPkvQzSDPPMuORM";

  /* ── DOM targets ───────────────────────────────────────── */
  var titleEl   = document.getElementById("post-title");
  var dateEl    = document.getElementById("post-date");
  var bodyEl    = document.getElementById("post-body");
  var navEl     = document.getElementById("post-nav");

  /* ── Slug from URL ─────────────────────────────────────── */
  function getSlug() {
    var params = new URLSearchParams(window.location.search);
    return params.get("slug") || "";
  }

  /* ── Hygraph GraphQL fetch ─────────────────────────────── */
  function hygraphFetch(query, variables) {
    return fetch(HYGRAPH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + HYGRAPH_TOKEN
      },
      body: JSON.stringify({ query: query, variables: variables || {} })
    }).then(function (r) {
      if (!r.ok) throw new Error("Hygraph fetch failed: " + r.status);
      return r.json();
    });
  }

  /* ── Date formatter ────────────────────────────────────── */
  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    });
  }

  /* ── Escape HTML helper ────────────────────────────────── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ── Slug → id helper for headings ────────────────────── */
  function slugify(str) {
    return str.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
  }

  /* ── Style rich text HTML to match existing design ─────── */
  // Hygraph returns clean HTML from the rich text field.
  // We inject inline styles to match the existing CSS classes.
  function styleRichHtml(html) {
    if (!html) return "";

    return html
      // Paragraphs
      .replace(/<p>/g, '<p class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-cOWITQ-color-gray12">')
      // Headings
      .replace(/<h2>/g, '<h2 data-heading="true" class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-hZNfDR-weight-500 c-iLbGmI-cOWITQ-color-gray12 c-iLbGmI-ifcaOLc-css">')
      .replace(/<h3>/g, '<h3 data-heading="true" class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-hZNfDR-weight-500 c-iLbGmI-cOWITQ-color-gray12 c-iLbGmI-ifcaOLc-css">')
      .replace(/<h4>/g, '<h4 data-heading="true" class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-hZNfDR-weight-500 c-iLbGmI-cOWITQ-color-gray12 c-iLbGmI-ifcaOLc-css">')
      // Blockquote
      .replace(/<blockquote>/g, '<blockquote class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-hgsrmT-color-gray11" style="border-left:3px solid var(--colors-gray6);padding-left:16px;margin:8px 0">')
      // Code inline
      .replace(/<code>/g, '<code class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-gGEEru-size-12 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-hgsrmT-color-gray11 c-iLbGmI-ibeaVNb-css">')
      // Links
      .replace(/<a /g, '<a class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-jIjxDA-size-14 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-cOWITQ-color-gray12 c-iLbGmI-ikkecHh-css" target="_blank" rel="noopener noreferrer" ')
      // Images — wrap in the card container
      .replace(/<img /g, '<div class="c-gtuqhG"><img loading="lazy" ')
      .replace(/(<div class="c-gtuqhG"><img[^>]+>)/g, "$1</div>")
      // iframes — wrap for aspect ratio
      .replace(/<iframe /g, '<div class="c-gtuqhG" style="aspect-ratio:16/9"><iframe style="width:100%;height:100%;border:0;border-radius:inherit" ')
      .replace(/(<div class="c-gtuqhG"[^>]*><iframe[^>]+><\/iframe>)/g, "$1</div>")
      // HR / divider
      .replace(/<hr>/g, '<hr class="c-kgqVMd" style="margin-top:24px;margin-bottom:24px" />')
      .replace(/<hr\/>/g, '<hr class="c-kgqVMd" style="margin-top:24px;margin-bottom:24px" />');
  }

  /* ── Render post ───────────────────────────────────────── */
  function renderPost(post) {
    var title   = post.title || "Blog Post";
    var dateStr = formatDate(post.postDate);
    var slug    = post.slug || "";
    var canonical = "https://www.yvesseraphin.xyz/blog/post/?slug=" + slug;
    var ogImg   = (post.coverImage && post.coverImage.url)
      ? post.coverImage.url
      : "https://www.yvesseraphin.xyz/assets/images/og.jpg";

    /* ── Meta ── */
    document.getElementById("page-title").textContent = title + " · Seraphin";
    setMeta("meta-description", "content", post.excerpt || dateStr);
    setMeta("og-title", "content", title);
    setMeta("og-description", "content", post.excerpt || dateStr);
    setMeta("og-url", "content", canonical);
    setMeta("og-image", "content", ogImg);
    setMeta("og-image-alt", "content", title);
    var canonEl = document.getElementById("canonical");
    if (canonEl) canonEl.setAttribute("href", canonical);

    /* ── Title + Date ── */
    if (titleEl) titleEl.textContent = title;
    if (dateEl)  dateEl.textContent  = dateStr;

    /* ── Body: iterate sections ── */
    // Hygraph returns sections as array if multiple values enabled,
    // or as a single object if only one section. Normalise to array.
    var rawSections = post.sections || [];
    var sections = Array.isArray(rawSections) ? rawSections : [rawSections];
    var html = "";
    var tocItems = [];

    sections.forEach(function (section) {
      if (!section) return;

      // Section heading → TOC entry
      if (section.heading) {
        var id = slugify(section.heading);
        tocItems.push({ id: id, label: section.heading });
        html +=
          '<h3 data-heading="true" id="' + escHtml(id) + '" ' +
          'class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 ' +
          'c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-hZNfDR-weight-500 ' +
          'c-iLbGmI-cOWITQ-color-gray12 c-iLbGmI-ifcaOLc-css">' +
          escHtml(section.heading) + "</h3>";
      }

      // Rich text content — content is an array of rich text blocks, join all html
      if (section.content) {
        var contentBlocks = Array.isArray(section.content) ? section.content : [section.content];
        contentBlocks.forEach(function (block) {
          if (block && block.html) {
            html += styleRichHtml(block.html);
          }
        });
      }
    });

    var wrapper =
      '<div class="c-gqwkJN c-gqwkJN-iTKOFX-direction-column ' +
      'c-gqwkJN-irEjuD-align-stretch c-gqwkJN-awKDG-justify-start ' +
      'c-gqwkJN-kVNAnR-wrap-no-wrap c-gqwkJN-llVfQI-gap-1">' +
      html + "</div>";

    if (bodyEl) bodyEl.innerHTML = wrapper;

    /* ── TOC ── */
    buildToc(tocItems);

    /* ── Prev / Next ── */
    buildNav(post.prev, post.next);
  }

  /* ── Build table of contents ───────────────────────────── */
  function buildToc(items) {
    var sidebar = document.querySelector(".c-lesPJm-ihxHQzT-css");
    if (!sidebar || !items.length) return;

    var nav = document.createElement("nav");
    nav.setAttribute("aria-label", "Table of contents");
    nav.style.cssText = "margin-top:24px;display:flex;flex-direction:column;gap:4px;";

    items.forEach(function (item) {
      var a = document.createElement("a");
      a.href = "#" + item.id;
      a.textContent = item.label;
      a.className = "c-gRVIZe";
      a.style.cssText = "font-size:13px;color:var(--colors-gray11);";
      nav.appendChild(a);
    });

    sidebar.appendChild(nav);

    var headings = Array.from(document.querySelectorAll("[data-heading]"));
    var links    = Array.from(nav.querySelectorAll("a"));

    function updateActive() {
      var scrollY = window.scrollY || window.pageYOffset;
      var active = null;
      headings.forEach(function (h) {
        if (h.getBoundingClientRect().top + scrollY - 140 <= scrollY) {
          active = h.id;
        }
      });
      links.forEach(function (l) {
        l.style.color = l.getAttribute("href") === "#" + active
          ? "var(--colors-gray12)"
          : "var(--colors-gray11)";
      });
    }

    window.addEventListener("scroll", updateActive, { passive: true });
    updateActive();
  }

  /* ── Build prev/next nav ───────────────────────────────── */
  function buildNav(prev, next) {
    if (!navEl) return;
    var html = "";

    if (prev) {
      html +=
        '<a class="c-bInnJf" href="?slug=' + escHtml(prev.slug) + '">' +
        '<div class="c-gqwkJN c-gqwkJN-ejCoEP-direction-row c-gqwkJN-jroWjL-align-center ' +
        'c-gqwkJN-awKDG-justify-start c-gqwkJN-kVNAnR-wrap-no-wrap c-gqwkJN-ilhikBv-css">Previous</div>' +
        '<span class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-jIjxDA-size-14 ' +
        'c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-cOWITQ-color-gray12">' +
        escHtml(prev.title) + "</span></a>";
    }

    if (next) {
      html +=
        '<a class="c-bInnJf" style="margin-left:auto" href="?slug=' + escHtml(next.slug) + '">' +
        '<div style="margin-left:auto" class="c-gqwkJN c-gqwkJN-ejCoEP-direction-row ' +
        'c-gqwkJN-jroWjL-align-center c-gqwkJN-awKDG-justify-start ' +
        'c-gqwkJN-kVNAnR-wrap-no-wrap c-gqwkJN-ilhikBv-css">Next</div>' +
        '<span class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-jIjxDA-size-14 ' +
        'c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-cOWITQ-color-gray12">' +
        escHtml(next.title) + "</span></a>";
    }

    navEl.innerHTML = html;
  }

  /* ── setAttribute helper for meta ─────────────────────── */
  function setMeta(id, attr, val) {
    var el = document.getElementById(id);
    if (el) el.setAttribute(attr, val);
  }

  /* ── Show error state ──────────────────────────────────── */
  function showError(msg) {
    if (bodyEl) {
      bodyEl.innerHTML =
        '<div class="c-gqwkJN c-gqwkJN-iTKOFX-direction-column ' +
        'c-gqwkJN-irEjuD-align-stretch c-gqwkJN-awKDG-justify-start ' +
        'c-gqwkJN-kVNAnR-wrap-no-wrap c-gqwkJN-llVfQI-gap-1">' +
        '<p class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 ' +
        'c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-hgsrmT-color-gray11">' +
        escHtml(msg) + "</p></div>";
    }
  }

  /* ── GraphQL query ─────────────────────────────────────── */
  var slug = getSlug();

  if (!slug) {
    showError("No post slug provided. Add ?slug=your-post-slug to the URL.");
    if (titleEl) titleEl.textContent = "Post not found";
    return;
  }

  var QUERY = `
    query GetPost($slug: String!) {
      post(where: { slug: $slug }) {
        title
        slug
        postDate
        excerpt
        coverImage { url }
        sections {
          heading
          content {
            html
          }
        }
      }
      # Prev post (older)
      prevPosts: posts(
        where: { slug_not: $slug }
        orderBy: postDate_DESC
        first: 1
      ) {
        title
        slug
        postDate
      }
      # Next post (newer)
      nextPosts: posts(
        where: { slug_not: $slug }
        orderBy: postDate_ASC
        first: 1
      ) {
        title
        slug
        postDate
      }
    }
  `;

  hygraphFetch(QUERY, { slug: slug })
    .then(function (data) {
      if (data.errors) {
        console.error("Hygraph errors:", data.errors);
        showError("Could not load post. Please try again later.");
        return;
      }

      var post = data.data && data.data.post;
      if (!post) {
        showError('Post "' + slug + '" not found.');
        if (titleEl) titleEl.textContent = "Post not found";
        return;
      }

      // Attach prev/next — simple approach: adjacent by date
      var allPrev = data.data.prevPosts || [];
      var allNext = data.data.nextPosts || [];
      post.prev = allPrev.length ? allPrev[0] : null;
      post.next = allNext.length ? allNext[0] : null;

      renderPost(post);
    })
    .catch(function (err) {
      console.error("post.js fetch error:", err);
      showError("Could not load post. Please try again later.");
    });

})();
