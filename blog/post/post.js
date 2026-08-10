/* ============================================================
   POST.JS — Fetches a single blog post from Sanity and renders
   it into the existing UI shell of blog/post/index.html.

   URL format:  /blog/post/?slug=my-post-slug

   Sanity schema (postType.ts):
     title        string
     slug         slug
     postDate     date
     excerpt      text  (optional)
     coverImage   image (optional)
     aspectRatio  number
     body         array of blocks (Portable Text) + image + codeBlock
     references   array of referenceItem { text, url }
     referencesHeading string
   ============================================================ */
(function () {
  "use strict";

  /* ── Sanity config ───────────────────────────────────────── */
  var PROJECT_ID  = "m77bsvm1";
  var DATASET     = "production";
  var API_VERSION = "2024-01-01";

  /* ── Read slug from URL immediately ─────────────────────── */
  var slug = new URLSearchParams(window.location.search).get("slug") || "";

  /* ── GROQ query ──────────────────────────────────────────── */
  var GROQ = slug
    ? '*[_type == "post" && slug.current == $slug][0]{' +
        'title, "slug": slug.current, postDate, excerpt, coverImage, aspectRatio, body, references, referencesHeading,' +
        '"prev": *[_type == "post" && postDate < ^.postDate] | order(postDate desc)[0]{ title, "slug": slug.current },' +
        '"next": *[_type == "post" && postDate > ^.postDate] | order(postDate asc)[0]{ title, "slug": slug.current }' +
      "}"
    : null;

  /* ── Fire fetch IMMEDIATELY — before DOM ready ───────────── */
  var fetchPromise = GROQ
    ? fetch(
        "https://" + PROJECT_ID + ".apicdn.sanity.io/v" + API_VERSION +
        "/data/query/" + DATASET + "?query=" + encodeURIComponent(GROQ) +
        "&$slug=" + encodeURIComponent(JSON.stringify(slug))
      ).then(function (r) { return r.json(); })
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

  /* ── Sanity image URL from asset ref ────────────────────── */
  function sanityImgUrl(ref, width) {
    if (!ref) return "";
    var parts = ref.split("-");
    var ext   = parts[parts.length - 1];
    var dims  = parts[parts.length - 2];
    var id    = parts.slice(1, parts.length - 2).join("-");
    var base  = "https://cdn.sanity.io/images/" + PROJECT_ID + "/" + DATASET + "/" + id + "-" + dims + "." + ext;
    return base + (width ? "?w=" + width + "&auto=format&fit=max" : "");
  }

  /* ── CSS class strings ───────────────────────────────────── */
  var P = "c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-cOWITQ-color-gray12";
  var H = "c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-hZNfDR-weight-500 c-iLbGmI-cOWITQ-color-gray12";
  var S = "c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-jIjxDA-size-14 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-hgsrmT-color-gray11";

  /* ── Code block builder ──────────────────────────────────── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

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

  /* ── Portable Text renderer ──────────────────────────────── */
  // Converts Sanity's body[] (Portable Text blocks + custom types) to HTML.
  function renderBody(blocks, tocItems) {
    if (!Array.isArray(blocks)) return "";
    var html = "";

    blocks.forEach(function (block) {
      if (!block) return;

      // ── Custom type: codeBlock ──
      if (block._type === "codeBlock") {
        html += buildCodeBlock(block.code || "", block.language || "code");
        return;
      }

      // ── Custom type: image ──
      if (block._type === "image") {
        var ref = block.asset && block.asset._ref;
        if (!ref) return;
        var alt = esc(block.alt || "");
        var caption = block.caption ? '<figcaption style="font-size:12px;color:var(--colors-gray10);text-align:center;margin-top:4px">' + esc(block.caption) + '</figcaption>' : "";
        html += '<figure class="c-gtuqhG" style="margin:12px 0">' +
          '<img src="' + esc(sanityImgUrl(ref, 1200)) + '" alt="' + alt + '" loading="lazy" decoding="async" ' +
          'style="width:100%;height:auto;display:block;border-radius:inherit">' +
          caption +
          '</figure>';
        return;
      }

      // ── Standard Portable Text block ──
      if (block._type !== "block") return;

      var style = block.style || "normal";
      var text  = renderSpans(block.children || [], block.markDefs || []);

      if (style === "h2") {
        var id2 = slugify(stripTags(text));
        tocItems.push({ id: id2, label: stripTags(text) });
        html += '<h2 id="' + id2 + '" data-toc="true" class="' + H + '" style="margin-top:32px;margin-bottom:8px">' + text + '</h2>';
      } else if (style === "h3") {
        var id3 = slugify(stripTags(text));
        tocItems.push({ id: id3, label: stripTags(text) });
        html += '<h3 id="' + id3 + '" data-toc="true" class="' + H + '" style="margin-top:24px;margin-bottom:6px">' + text + '</h3>';
      } else if (style === "blockquote") {
        html += '<blockquote class="' + S + '" style="border-left:3px solid var(--colors-gray6);padding-left:16px;margin:8px 0">' + text + '</blockquote>';
      } else {
        // normal — wrap in <p> unless empty
        if (text.trim()) {
          html += '<p class="' + P + '">' + text + '</p>';
        }
      }
    });

    return html;
  }

  /* ── Render a span array with marks ─────────────────────── */
  function renderSpans(children, markDefs) {
    if (!Array.isArray(children)) return "";
    return children.map(function (span) {
      var text = esc(span.text || "");
      var marks = span.marks || [];

      marks.forEach(function (mark) {
        if (mark === "strong") {
          text = "<strong>" + text + "</strong>";
        } else if (mark === "em") {
          text = "<em>" + text + "</em>";
        } else if (mark === "code") {
          text = '<code class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-gGEEru-size-12 ' +
            'c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 ' +
            'c-iLbGmI-hgsrmT-color-gray11 c-iLbGmI-ibeaVNb-css">' + text + '</code>';
        } else {
          // Check if it's a link annotation
          var def = (markDefs || []).find(function (d) { return d._key === mark; });
          if (def && def._type === "link" && def.href) {
            text = '<a class="' + S + ' c-iLbGmI-ikkecHh-css" href="' + esc(def.href) + '" target="_blank" rel="noopener noreferrer">' + text + '</a>';
          }
        }
      });

      return text;
    }).join("");
  }

  function stripTags(html) {
    return html.replace(/<[^>]+>/g, "");
  }

  /* ── References section builder ─────────────────────────── */
  function renderReferences(heading, items) {
    if (!items || !items.length) return "";
    var id = slugify(heading || "references");
    var html = '<h3 data-heading="true" id="' + esc(id) + '" class="post-references-heading">' +
      esc(heading || "References") + '</h3>';
    html += '<ol class="post-references-list">';
    items.forEach(function (item) {
      html += "<li>";
      if (item && item.url) {
        html += '<a href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer">' +
          esc(item.text || item.url) + '</a>';
      } else {
        html += esc(item && item.text ? item.text : String(item || ""));
      }
      html += "</li>";
    });
    html += "</ol>";
    return html;
  }

  /* ── Build left sidebar TOC ──────────────────────────────── */
  function buildToc(items) {
    var sidebar = document.getElementById("post-toc");
    if (!sidebar) return;
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

  /* ── Build prev/next nav ────────────────────────────────── */
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
    var coverRef = post.coverImage && post.coverImage.asset ? post.coverImage.asset._ref : null;
    var ogImg    = coverRef
      ? sanityImgUrl(coverRef, 1200)
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

    var tocItems = [];
    var bodyHtml = "";

    // Cover image
    if (coverRef) {
      bodyHtml +=
        '<div class="c-gtuqhG" style="margin-bottom:24px">' +
        '<img src="' + esc(sanityImgUrl(coverRef, 1200)) + '" loading="eager" decoding="async" ' +
        'alt="Cover image" style="width:100%;height:auto;display:block;border-radius:inherit">' +
        '</div>';
    }

    // Portable Text body
    bodyHtml += renderBody(post.body || [], tocItems);

    // References section
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

    /* ── Reveal divider + nav ── */
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

    if (!slug || !data || !data.result) {
      var titleEl = document.getElementById("post-title");
      if (titleEl) titleEl.textContent = "Post not found";
      return;
    }

    renderPost(data.result);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      fetchPromise.then(onReady).catch(function () { initCopyButton(); });
    });
  } else {
    fetchPromise.then(onReady).catch(function () { initCopyButton(); });
  }

})();
