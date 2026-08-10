/* ============================================================
   POST.JS — Fetches a single blog post from Hygraph and renders
   it into the existing UI shell of blog/post/index.html.

   URL format:  /blog/post/?slug=my-post-slug

   Hygraph Post model expected fields:
     title        String
     slug         String
     postDate     Date
     excerpt      String  (optional — used for meta description)
     coverImage   Asset   (optional — hero image)
     sections     [Section] where each Section has:
       heading    String  (optional)
       image      Asset   (optional)
       content    RichText (optional — .html)
   ============================================================ */
(function () {
  "use strict";

  /* ── Hygraph config ──────────────────────────────────────── */
  var ENDPOINT = "https://eu-west-2.cdn.hygraph.com/content/cms96wuqa009e07uugpyxsqs7/master";
  var TOKEN    = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImdjbXMtbWFpbi1wcm9kdWN0aW9uIn0.eyJ2ZXJzaW9uIjozLCJpYXQiOjE3ODU5NzY3ODgsImF1ZCI6WyJodHRwczovL2FwaS1ldS13ZXN0LTIuaHlncmFwaC5jb20vdjIvY21zOTZ3dXFhMDA5ZTA3dXVncHl4c3FzNy9tYXN0ZXIiLCJtYW5hZ2VtZW50LW5leHQuZ3JhcGhjbXMuY29tIl0sImlzcyI6Imh0dHBzOi8vbWFuYWdlbWVudC1ldS13ZXN0LTIuaHlncmFwaC5jb20vIiwic3ViIjoiMGE4MWZiZTEtNWQ2OS00NTlhLWI1OWEtOWE0NjVlZDMxZTFkIiwianRpIjoiY21zZ3NndHB6MG84dzA3bW9kc2ZlZDQyMiJ9.QfZ5aFKj3rE-m77VOd_EZ0X54CW74yizyS7e2G30HSfXOlSrfs86CWPpMpzIyGu0af_HHPaJ8gSx7o31RLU66ldZNakjFEuqPKiKgRnnj1hu8m6iWq724rfCKJPfuakOhD1_KS2Dj2h2bL4h7T6p9Bqc98mr856jjaWFVtahkpTVMvL98SJfeuR1ZzlZyEiuczmxeS_g1H0iEk-cMgI7knXF2uj7G_Eizclgh4HrBph-uMdJOycZOfYWY3klCxGPHVGusSfkJfvc3Z2FFjbbw1t23NgWGGHtW4ckXwqJZNyxcfjZiq4RRU4X0MU-rC_BjLqfO9b1fgMVfiZpPRVnrGSbOOU491CQHwEFgagcabc9MmEkOYqg6ofrg3J0NTfsV2KHThZWKyv8K4yiBKf5ayjbDXpIpQVeE_Domr9MHyblyFEh1nlmZGqJgb5n9CgPzRFbBDgehfa61b_Jnc2eeA18AMaxzO_RpX4vdc8ud96VfGiVqmxfpYzDngFo5X4Z0OsI-p_-j3-huWeX24AcDjF3PegERCILhPkv0DHUnJLWXDWAL0RZBH4UjyXixaWawMDUzVGqqLTTRYQLYiJafFmbyshmdGIDOsMH4w_AIMOYZQbceviGYjEL0-CfuJ0MC46O-lmcL9mYgc-2J6lsbdjetu7lZPkvQzSDPPMuORM";

  /* ── Read slug from URL immediately ─────────────────────── */
  var slug = new URLSearchParams(window.location.search).get("slug") || "";

  /* ── GraphQL query ───────────────────────────────────────── */
  // sections are ordered by Hygraph's built-in position field.
  // Each section can have any combination of: heading, image, content.
  // All three are optional — you control the structure per-section.
  var QUERY = [
    "query GetPost($slug:String!){",
      "post(where:{slug:$slug}){",
        "title slug postDate excerpt",
        "coverImage{ url }",
        "sections{",
          "heading",
          "image{ url }",
          "content{ html }",
        "}",
        "references{",
          "... on Reference {",
            "text url",
          "}",
        "}",
        "referencesHeading",
      "}",
      "prev:posts(where:{slug_not:$slug} orderBy:postDate_DESC first:1){ title slug }",
      "next:posts(where:{slug_not:$slug} orderBy:postDate_ASC first:1){ title slug }",
    "}"
  ].join(" ");

  /* ── Fire fetch immediately — before DOM ready ───────────── */
  var fetchPromise = slug
    ? fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + TOKEN },
        body: JSON.stringify({ query: QUERY, variables: { slug: slug } })
      }).then(function (r) { return r.json(); })
    : Promise.resolve(null);

  /* ── Helpers ─────────────────────────────────────────────── */
  function esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function slugify(str) {
    return String(str || "").toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
  }

  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  /* ── Style rich-text HTML ────────────────────────────────── */
  var P  = "c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-cOWITQ-color-gray12";
  var H  = "c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-hZNfDR-weight-500 c-iLbGmI-cOWITQ-color-gray12";
  var S  = "c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-jIjxDA-size-14 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-hgsrmT-color-gray11";

  /* ── Code block builder ──────────────────────────────────── */
  // Matches the exact structure from graph-slider.html:
  //   <div class="codeblock_root__pf0C4">
  //     <div class="tsx codeblock_editor__Hq7SO" style="color:var(--code-fg);...">
  //       <div class="token-line codeblock_line__5uT_I" ...>...</div>
  //       ...
  //     </div>
  //   </div>
  function buildCodeBlock(code, lang) {
    var language = lang || "code";
    var lines = code.split("\n");
    var linesHtml = lines.map(function (line) {
      return '<div class="token-line codeblock_line__5uT_I" ' +
        'style="color:var(--code-fg);background:var(--code-bg);font-family:var(--fonts-mono);font-size:13px">' +
        escHtml(line) +
        '</div>';
    }).join("");
    return '<div class="codeblock_root__pf0C4">' +
      '<div class="' + language + ' codeblock_editor__Hq7SO" ' +
        'style="color:var(--code-fg);background:var(--code-bg);font-family:var(--fonts-mono);font-size:13px">' +
      linesHtml +
      '</div>' +
    '</div>';
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ── References / Resources section builder ─────────────── */
  // Matches the exact structure from index reference.html:
  //   <h3 data-heading="true" id="resources" class="c-iLbGmI ... c-iLbGmI-ifcaOLc-css">Resources</h3>
  //   <ol class="c-lesPJm c-lesPJm-iilMZTZ-css"> ← padding-left:27px
  //     <li>
  //       <a href="..." target="_blank" rel="noopener noreferrer"
  //          class="c-iLbGmI ... c-iLbGmI-ikkecHh-css">Title (Year)</a>
  //     </li>
  //     ...
  //   </ol>
  // Each reference item can be:
  //   - a plain string  → rendered as plain <li> text
  //   - { text, url }   → rendered as underlined link
  function renderReferences(heading, items) {
    if (!items || !items.length) return "";
    var id = slugify(heading || "references");
    var html = '<h3 data-heading="true" id="' + esc(id) + '" ' +
      'class="post-references-heading">' +
      esc(heading || "References") + '</h3>';
    html += '<ol class="post-references-list">';
    items.forEach(function (item) {
      html += "<li>";
      if (item && typeof item === "object" && item.url) {
        html += '<a href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer">' +
          esc(item.text || item.url) + '</a>';
      } else {
        html += esc(String(item || ""));
      }
      html += "</li>";
    });
    html += "</ol>";
    return html;
  }

  function styleRichHtml(html) {
    if (!html) return "";
    // Normalise video tags to autoplay/muted
    html = html.replace(/<video[^>]*>/g,
      '<video autoplay muted loop playsinline preload="auto" style="width:100%;display:block;border-radius:inherit">');

    // Convert <pre><code class="language-xxx">...</code></pre> into the
    // codeblock_root structure matching graph-slider.html exactly.
    html = html.replace(
      /<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g,
      function (_, lang, code) {
        // Hygraph encodes HTML entities inside code blocks — decode first
        var decoded = code
          .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'").replace(/&#39;/g, "'");
        // Strip trailing newline
        decoded = decoded.replace(/\n$/, "");
        return buildCodeBlock(decoded, lang || "code");
      }
    );

    // Plain <pre> blocks (no wrapping <code>) — also convert
    html = html.replace(
      /<pre>([\s\S]*?)<\/pre>/g,
      function (_, code) {
        var decoded = code
          .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'").replace(/&#39;/g, "'");
        decoded = decoded.replace(/\n$/, "");
        return buildCodeBlock(decoded, "code");
      }
    );

    // Inline <code> — the small monospace chip (c-iLbGmI-ibeaVNb-css style)
    html = html.replace(
      /<code>/g,
      '<code class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-gGEEru-size-12 ' +
        'c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 ' +
        'c-iLbGmI-hgsrmT-color-gray11 c-iLbGmI-ibeaVNb-css">'
    );

    return html
      .replace(/<p>/g,          '<p class="' + P + '">')
      .replace(/<h2>/g,         '<h2 data-toc="true" class="' + H + '">')
      .replace(/<h3>/g,         '<h3 data-toc="true" class="' + H + '">')
      .replace(/<h4>/g,         '<h4 data-toc="true" class="' + H + '">')
      .replace(/<blockquote>/g, '<blockquote class="' + S + '" style="border-left:3px solid var(--colors-gray6);padding-left:16px;margin:8px 0">')
      .replace(/<a /g,          '<a class="' + S + ' c-iLbGmI-ikkecHh-css" target="_blank" rel="noopener noreferrer" ')
      .replace(/<img ([^>]+)>/g,'<div class="c-gtuqhG"><img $1 loading="lazy"></div>')
      .replace(/(<video[^>]*>[\s\S]*?<\/video>)/g, '<div class="c-gtuqhG">$1</div>')
      .replace(/<iframe ([^>]+)><\/iframe>/g, '<div class="c-gtuqhG" style="aspect-ratio:16/9"><iframe $1 style="width:100%;height:100%;border:0;border-radius:inherit"></iframe></div>')
      .replace(/<hr\s*\/?>/g,   '<hr style="height:1px;background:var(--colors-gray6);border:0;margin:24px 0" />');
  }

  /* ── Render cover image ──────────────────────────────────── */
  function renderCover(url) {
    if (!url) return "";
    return '<div class="c-gtuqhG" style="margin-bottom:24px">' +
      '<img src="' + esc(url) + '?w=1200&auto=format" loading="eager" decoding="async" ' +
      'style="width:100%;height:auto;display:block;border-radius:inherit" alt="Cover image">' +
      '</div>';
  }

  /* ── Render one section ──────────────────────────────────── */
  // A section can have any combination of heading / image / content.
  // All three are optional. Hygraph's field order determines render order:
  //   1. heading (if present)
  //   2. image   (if present)
  //   3. content (if present)
  // To reorder (e.g. image first, then heading, then text), just reorder
  // the fields in your Hygraph Section component definition.
  function renderSection(section, tocItems) {
    var html = "";

    // ── Heading ──
    if (section.heading) {
      var id = slugify(section.heading);
      tocItems.push({ id: id, label: section.heading });
      html += '<h2 id="' + esc(id) + '" data-toc="true" class="' + H + '" ' +
              'style="margin-top:32px;margin-bottom:8px">' +
              esc(section.heading) + '</h2>';
    }

    // ── Image ──
    if (section.image && section.image.url) {
      html += '<div class="c-gtuqhG" style="margin:12px 0">' +
        '<img src="' + esc(section.image.url) + '?w=1200&auto=format" loading="lazy" decoding="async" ' +
        'style="width:100%;height:auto;display:block;border-radius:inherit" alt="">' +
        '</div>';
    }

    // ── Rich text content ──
    if (section.content && section.content.html) {
      // Also pick up any h2/h3 inside rich text for TOC
      var richHtml = styleRichHtml(section.content.html);
      // Extract headings from rich text to add to TOC
      var headingRe = /<h[23][^>]*>([^<]+)<\/h[23]>/g;
      var m;
      while ((m = headingRe.exec(richHtml)) !== null) {
        var hText = m[1].replace(/<[^>]+>/g, "").trim();
        if (hText) tocItems.push({ id: slugify(hText), label: hText });
      }
      html += richHtml;
    }

    return html;
  }

  /* ── Build left sidebar TOC ──────────────────────────────── */
  function buildToc(items) {
    var sidebar = document.getElementById("post-toc");
    if (!sidebar) return;
    // Clear previous
    sidebar.innerHTML = "";
    if (!items.length) return;

    var nav = document.createElement("nav");
    nav.setAttribute("aria-label", "Table of contents");
    nav.style.cssText = "display:flex;flex-direction:column;gap:4px;margin-top:32px;";

    items.forEach(function (item) {
      var a = document.createElement("a");
      a.href = "#" + item.id;
      a.textContent = item.label;
      a.className = "c-gRVIZe";
      a.style.cssText = "font-size:13px;color:var(--colors-gray11);line-height:1.5;";
      nav.appendChild(a);
    });

    sidebar.appendChild(nav);

    // Active link tracking on scroll
    function updateActive() {
      var scrollY = window.scrollY || window.pageYOffset;
      var active = null;
      document.querySelectorAll("[data-toc]").forEach(function (h) {
        if (h.id && h.getBoundingClientRect().top + scrollY - 120 <= scrollY) {
          active = h.id;
        }
      });
      nav.querySelectorAll("a").forEach(function (a) {
        var isActive = a.getAttribute("href") === "#" + active;
        a.style.color = isActive ? "var(--colors-gray12)" : "var(--colors-gray11)";
        a.style.fontWeight = isActive ? "500" : "400";
      });
    }
    window.addEventListener("scroll", updateActive, { passive: true });
    updateActive();
  }

  /* ── Build next article nav (matches reference exactly) ──── */
  // Reference structure:
  // <footer class="c-gqwkJN ... c-gqwkJN-ifGHEql-css">
  //   <a class="c-bInnJf" href="?slug=...">
  //     <div class="... c-gqwkJN-ilhikBv-css">Previous</div>
  //     <span class="c-iLbGmI ...">Title</span>
  //   </a>
  //   <a class="c-bInnJf" style="margin-left:auto" href="?slug=...">
  //     <div style="margin-left:auto" class="... c-gqwkJN-ilhikBv-css">Next</div>
  //     <span class="c-iLbGmI ...">Title</span>
  //   </a>
  // </footer>
  function buildNav(prev, next) {
    var navEl = document.getElementById("post-nav");
    if (!navEl) return;
    var html = "";

    if (prev) {
      html +=
        '<a class="c-bInnJf" href="?slug=' + esc(prev.slug) + '">' +
          '<div class="c-gqwkJN c-gqwkJN-ejCoEP-direction-row c-gqwkJN-jroWjL-align-center ' +
               'c-gqwkJN-awKDG-justify-start c-gqwkJN-kVNAnR-wrap-no-wrap c-gqwkJN-ilhikBv-css">Previous</div>' +
          '<span class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-jIjxDA-size-14 ' +
               'c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-cOWITQ-color-gray12">' +
          esc(prev.title) + '</span>' +
        '</a>';
    }

    if (next) {
      html +=
        '<a class="c-bInnJf" style="margin-left:auto" href="?slug=' + esc(next.slug) + '">' +
          '<div style="margin-left:auto" class="c-gqwkJN c-gqwkJN-ejCoEP-direction-row ' +
               'c-gqwkJN-jroWjL-align-center c-gqwkJN-awKDG-justify-start ' +
               'c-gqwkJN-kVNAnR-wrap-no-wrap c-gqwkJN-ilhikBv-css">Next</div>' +
          '<span class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-jIjxDA-size-14 ' +
               'c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-cOWITQ-color-gray12">' +
          esc(next.title) + '</span>' +
        '</a>';
    }

    navEl.innerHTML = html;
  }

  /* ── Copy URL button ─────────────────────────────────────── */
  function initCopyButton() {
    var btn = document.querySelector('[aria-label="Copy URL"]');
    if (!btn) return;
    btn.addEventListener("click", function () {
      var url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(showCopied, fallback);
      } else {
        fallback();
      }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); showCopied(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });

    function showCopied() {
      var orig = btn.getAttribute("aria-label");
      btn.setAttribute("aria-label", "Copied!");
      btn.style.background = "var(--colors-gray4)";
      // Swap icon to a checkmark briefly
      var svg = btn.querySelector("svg");
      var origSvg = svg ? svg.outerHTML : "";
      if (svg) svg.outerHTML = '<svg width="24px" height="24px" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      setTimeout(function () {
        btn.setAttribute("aria-label", orig);
        btn.style.background = "";
        var newSvg = btn.querySelector("svg");
        if (newSvg && origSvg) newSvg.outerHTML = origSvg;
      }, 2000);
    }
  }

  /* ── Main render ─────────────────────────────────────────── */
  function renderPost(post) {
    var title    = post.title || "Blog Post";
    var dateStr  = formatDate(post.postDate);
    var canonical = "https://www.yvesseraphin.xyz/blog/post/?slug=" + (post.slug || "");
    var ogImg    = (post.coverImage && post.coverImage.url)
      ? post.coverImage.url
      : "https://www.yvesseraphin.xyz/assets/images/og.jpg";

    /* ── Page meta ── */
    document.getElementById("page-title").textContent = title + " · Seraphin";
    setMeta("meta-description", post.excerpt || title);
    setMeta("og-title",         title);
    setMeta("og-description",   post.excerpt || title);
    setMeta("og-url",           canonical);
    setMeta("og-image",         ogImg);
    setMeta("og-image-alt",     title);
    var canonEl = document.getElementById("canonical");
    if (canonEl) canonEl.setAttribute("href", canonical);

    /* ── Title + date ── */
    var titleEl  = document.getElementById("post-title");
    var dateEl   = document.getElementById("post-date");
    var headerEl = document.getElementById("post-header");
    if (titleEl) titleEl.textContent = title;
    if (dateEl)  dateEl.textContent  = dateStr;
    if (headerEl) headerEl.style.visibility = "";

    /* ── Body ── */
    var bodyEl = document.getElementById("post-body");
    if (!bodyEl) return;

    var sections   = post.sections || [];
    if (!Array.isArray(sections)) sections = [sections];
    var tocItems   = [];
    var bodyHtml   = "";

    // Cover image at the very top of the body
    if (post.coverImage && post.coverImage.url) {
      bodyHtml += renderCover(post.coverImage.url);
    }

    // Each section renders in order: heading → image → content
    sections.forEach(function (section) {
      if (section) bodyHtml += renderSection(section, tocItems);
    });

    // ── References / Resources section ──
    // Rendered after all sections, matching index reference.html exactly.
    // post.references is an array of { text, url } objects from Hygraph.
    // post.referencesHeading defaults to "References" if not set.
    var refs = post.references || [];
    if (refs.length) {
      var refHeading = post.referencesHeading || "References";
      var refId = slugify(refHeading);
      tocItems.push({ id: refId, label: refHeading });
      bodyHtml += renderReferences(refHeading, refs);
    }

    bodyEl.innerHTML = bodyHtml;

    /* ── Left sidebar TOC ── */
    buildToc(tocItems);

    /* ── Reveal divider + nav now that content is ready ── */
    var divider = document.getElementById("post-divider");
    var navEl   = document.getElementById("post-nav");
    if (divider) divider.style.visibility = "";
    if (navEl)   navEl.style.visibility   = "";

    /* ── Prev / Next nav ── */
    buildNav(post.prev || null, post.next || null);
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function setMeta(id, val) {
    var el = document.getElementById(id);
    if (el) el.setAttribute("content", val || "");
  }

  /* ── Resolve when DOM + data both ready ──────────────────── */
  function onReady(data) {
    initCopyButton();

    if (!slug || !data || data.errors || !data.data || !data.data.post) {
      var titleEl = document.getElementById("post-title");
      if (titleEl) titleEl.textContent = "Post not found";
      return;
    }

    var post  = data.data.post;
    var prevs = data.data.prev || [];
    var nexts = data.data.next || [];
    post.prev = prevs.length ? prevs[0] : null;
    post.next = nexts.length ? nexts[0] : null;

    renderPost(post);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      fetchPromise.then(onReady).catch(function () { initCopyButton(); });
    });
  } else {
    fetchPromise.then(onReady).catch(function () { initCopyButton(); });
  }

})();
