/* ============================================================
   POST.JS — Fetches a single blog post from Sanity and renders
   it into the existing UI shell of blog/post/index.html.

   URL format:  /blog/post/?slug=my-post-slug
   ============================================================ */
(function () {
  "use strict";

  /* ── Sanity config ─────────────────────────────────────── */
  var PROJECT_ID = "bvxz357b";
  var DATASET    = "production";
  var API_VER    = "2024-01-01";

  /* ── DOM targets ───────────────────────────────────────── */
  var titleEl   = document.getElementById("post-title");
  var dateEl    = document.getElementById("post-date");
  var bodyEl    = document.getElementById("post-body");
  var navEl     = document.getElementById("post-nav");
  var loadingEl = document.getElementById("post-loading");

  /* ── Slug from URL ─────────────────────────────────────── */
  function getSlug() {
    var params = new URLSearchParams(window.location.search);
    return params.get("slug") || "";
  }

  /* ── Sanity CDN fetch ──────────────────────────────────── */
  function sanityFetch(query) {
    var encoded = encodeURIComponent(query);
    var url =
      "https://" +
      PROJECT_ID +
      ".apicdn.sanity.io/v" +
      API_VER +
      "/data/query/" +
      DATASET +
      "?query=" +
      encoded;
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("Sanity fetch failed: " + r.status);
      return r.json();
    });
  }

  /* ── Date formatter ────────────────────────────────────── */
  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  /* ── Portable Text → HTML ──────────────────────────────── */
  // Minimal renderer for Sanity's block content (portable text).
  function blockToHtml(block) {
    if (!block || !block._type) return "";

    // ── Regular paragraph / heading block ──
    if (block._type === "block") {
      var tag = block.style === "h2" ? "h2"
              : block.style === "h3" ? "h3"
              : block.style === "h4" ? "h4"
              : block.style === "blockquote" ? "blockquote"
              : "p";

      var pClass = tag === "p"
        ? 'class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-cOWITQ-color-gray12"'
        : 'data-heading="true" class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-hZNfDR-weight-500 c-iLbGmI-cOWITQ-color-gray12 c-iLbGmI-ifcaOLc-css"';

      var inner = (block.children || []).map(function (span) {
        if (span._type !== "span") return "";
        var text = escHtml(span.text || "");
        var marks = span.marks || [];

        marks.forEach(function (mark) {
          if (mark === "strong") text = "<strong>" + text + "</strong>";
          else if (mark === "em") text = "<em>" + text + "</em>";
          else if (mark === "code") {
            text =
              '<code class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-gGEEru-size-12 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-hgsrmT-color-gray11 c-iLbGmI-ibeaVNb-css">' +
              text +
              "</code>";
          } else if (mark === "underline") {
            text = '<span style="text-decoration:underline">' + text + "</span>";
          }
        });

        // Resolve link marks (markDefs)
        if (block.markDefs) {
          block.markDefs.forEach(function (def) {
            if (marks.indexOf(def._key) !== -1 && def._type === "link") {
              text =
                '<a href="' +
                escHtml(def.href) +
                '" target="_blank" rel="noopener noreferrer" ' +
                'class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-jIjxDA-size-14 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-cOWITQ-color-gray12 c-iLbGmI-ikkecHh-css">' +
                text +
                "</a>";
            }
          });
        }

        return text;
      }).join("");

      return "<" + tag + " " + pClass + ">" + inner + "</" + tag + ">";
    }

    // ── Image ──
    if (block._type === "postImage") {
      var imgUrl = block.asset && block.asset.url ? block.asset.url + "?w=1200&auto=format" : "";
      var alt    = escHtml(block.alt || "");
      var cap    = block.caption ? '<p class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-gGEEru-size-12 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-hgsrmT-color-gray11" style="margin-top:8px;text-align:center">' + escHtml(block.caption) + "</p>" : "";
      return (
        '<div class="c-gtuqhG"><img src="' +
        imgUrl +
        '" alt="' +
        alt +
        '" loading="lazy" /></div>' +
        cap
      );
    }

    // ── Video ──
    if (block._type === "postVideo") {
      var vUrl = block.url || "";
      var cap2 = block.caption ? '<p class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-gGEEru-size-12 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-hgsrmT-color-gray11" style="margin-top:8px;text-align:center">' + escHtml(block.caption) + "</p>" : "";
      var autoAttrs = block.autoplay !== false ? 'autoplay muted loop playsinline' : 'controls';
      // If it's a direct mp4 link
      if (vUrl.match(/\.mp4/i)) {
        return (
          '<div class="c-gtuqhG"><video ' +
          autoAttrs +
          ' src="' + escHtml(vUrl) + '"></video></div>' +
          cap2
        );
      }
      // Fallback: iframe for YouTube/Vimeo
      return (
        '<div class="c-gtuqhG" style="aspect-ratio:16/9"><iframe src="' +
        escHtml(vUrl) +
        '" frameborder="0" allowfullscreen style="width:100%;height:100%;border-radius:inherit"></iframe></div>' +
        cap2
      );
    }

    // ── Divider ──
    if (block._type === "divider") {
      return '<hr class="c-kgqVMd" style="margin-top:24px;margin-bottom:24px" />';
    }

    return "";
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

  /* ── Render post ───────────────────────────────────────── */
  function renderPost(post) {
    /* ── Meta tags ── */
    var title = post.title || "Blog Post";
    var dateStr = formatDate(post.publishedAt);
    var slug = post.slug || "";
    var canonical = "https://www.yvesseraphin.xyz/blog/post/?slug=" + slug;
    var ogImg = post.coverImageUrl || "https://www.yvesseraphin.xyz/assets/images/og.jpg";

    document.getElementById("page-title").textContent = title + " · Seraphin";
    setMeta("meta-description", "content", dateStr);
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

    /* ── Body ── */
    var sections = post.sections || [];
    var html = "";
    var tocItems = [];

    sections.forEach(function (section) {
      if (!section) return;

      // Section heading → TOC entry
      if (section.heading) {
        var id = slugify(section.heading);
        tocItems.push({ id: id, label: section.heading });
        html +=
          '<h3 data-heading="true" id="' +
          id +
          '" class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-hZNfDR-weight-500 c-iLbGmI-cOWITQ-color-gray12 c-iLbGmI-ifcaOLc-css">' +
          escHtml(section.heading) +
          "</h3>";
      }

      // Content blocks
      var content = section.content || [];
      content.forEach(function (block) {
        html += blockToHtml(block);
      });
    });

    // Wrap in the column container that matches the original UI
    var wrapper =
      '<div class="c-gqwkJN c-gqwkJN-iTKOFX-direction-column c-gqwkJN-irEjuD-align-stretch c-gqwkJN-awKDG-justify-start c-gqwkJN-kVNAnR-wrap-no-wrap c-gqwkJN-llVfQI-gap-1">' +
      html +
      "</div>";

    if (bodyEl) {
      bodyEl.innerHTML = wrapper;
    }

    /* ── TOC (sidebar nav) ── */
    buildToc(tocItems);

    /* ── Prev / Next ── */
    buildNav(post.prev, post.next);
  }

  /* ── Build table of contents ───────────────────────────── */
  function buildToc(items) {
    // Find the ihxHQzT sidebar container — it holds the "← Blog" back link
    // and optionally a <nav> for TOC. We only add TOC if there are entries.
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

    // Highlight active TOC entry on scroll
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
        '<a class="c-bInnJf" href="?slug=' +
        escHtml(prev.slug) +
        '">' +
        '<div class="c-gqwkJN c-gqwkJN-ejCoEP-direction-row c-gqwkJN-jroWjL-align-center c-gqwkJN-awKDG-justify-start c-gqwkJN-kVNAnR-wrap-no-wrap c-gqwkJN-ilhikBv-css">Previous</div>' +
        '<span class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-jIjxDA-size-14 c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-cOWITQ-color-gray12">' +
        escHtml(prev.title) +
        "</span></a>";
    }

    if (next) {
      html +=
        '<a class="c-bInnJf" style="margin-left:auto" href="?slug=' +
        escHtml(next.slug) +
        '">' +
        '<div style="margin-left:auto" class="c-gqwkJN c-gqwkJN-ejCoEP-direction-row c-gqwkJN-jroWjL-align-center c-gqwkJN-awKDG-justify-start c-gqwkJN-kVNAnR-wrap-no-wrap c-gqwkJN-ilhikBv-css">Next</div>' +
        '<span class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-jIjxDA-size-14 c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-cOWITQ-color-gray12">' +
        escHtml(next.title) +
        "</span></a>";
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
        '<div class="c-gqwkJN c-gqwkJN-iTKOFX-direction-column c-gqwkJN-irEjuD-align-stretch c-gqwkJN-awKDG-justify-start c-gqwkJN-kVNAnR-wrap-no-wrap c-gqwkJN-llVfQI-gap-1">' +
        '<p class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-hgsrmT-color-gray11">' +
        escHtml(msg) +
        "</p></div>";
    }
  }

  /* ── Main fetch ────────────────────────────────────────── */
  var slug = getSlug();

  if (!slug) {
    showError("No post slug provided. Add ?slug=your-post-slug to the URL.");
    if (titleEl) titleEl.textContent = "Post not found";
    return;
  }

  // Fetch the post + its immediate neighbours (for prev/next) in one request
  var QUERY =
    '*[_type == "post" && slug.current == $slug][0]{' +
    '  title,' +
    '  publishedAt,' +
    '  excerpt,' +
    '  "slug": slug.current,' +
    '  "coverImageUrl": coverImage.asset->url,' +
    '  sections[]{' +
    '    heading,' +
    '    content[]{' +
    '      ...,' +
    '      _type == "postImage" => {' +
    '        ..., "asset": asset->{url}' +
    '      }' +
    '    }' +
    '  },' +
    '  "prev": *[_type == "post" && publishedAt < ^.publishedAt] | order(publishedAt desc)[0]{"slug": slug.current, title},' +
    '  "next": *[_type == "post" && publishedAt > ^.publishedAt] | order(publishedAt asc)[0]{"slug": slug.current, title}' +
    '}';

  // Replace $slug param — Sanity CDN supports GROQ params via ?$slug="value"
  var encoded =
    encodeURIComponent(QUERY) +
    "&%24slug=" +
    encodeURIComponent('"' + slug + '"');

  var url =
    "https://" +
    PROJECT_ID +
    ".apicdn.sanity.io/v" +
    API_VER +
    "/data/query/" +
    DATASET +
    "?query=" +
    encoded;

  fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      var post = data.result;
      if (!post) {
        showError('Post "' + slug + '" not found in Sanity.');
        if (titleEl) titleEl.textContent = "Post not found";
        return;
      }
      renderPost(post);
    })
    .catch(function (err) {
      console.error("post.js fetch error:", err);
      showError("Could not load post. Please try again later.");
    });
})();
