/* ============================================================
   POST.JS — Fetches a single blog post from Sanity and renders
   it into the existing UI shell of blog/post/index.html.
   Speed strategy:
     1. Fetch fires at script-parse time (before DOM ready)
     2. sessionStorage cache — same-session revisits are instant
     3. No skeleton, no loading state — content paints in one shot
   ============================================================ */
(function () {
  "use strict";

  var PROJECT_ID  = "m77bsvm1";
  var DATASET     = "production";
  var API_VERSION = "2024-01-01";

  var slug = new URLSearchParams(window.location.search).get("slug") || "";

  /* ── sessionStorage cache (instant on back-navigation) ── */
  var CACHE_KEY = "post_cache_" + slug;
  function readCache() {
    try { return JSON.parse(sessionStorage.getItem(CACHE_KEY)); } catch(e) { return null; }
  }
  function writeCache(data) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch(e) {}
  }

  /* ── GROQ query ── */
  var GROQ = slug
    ? '*[_type == "post" && slug.current == $slug][0]{' +
        'title, "slug": slug.current, postDate, excerpt, coverImage, aspectRatio, body, references, referencesHeading,' +
        '"prev": *[_type == "post" && postDate < ^.postDate] | order(postDate desc)[0]{ title, "slug": slug.current },' +
        '"next": *[_type == "post" && postDate > ^.postDate] | order(postDate asc)[0]{ title, "slug": slug.current }' +
      "}"
    : null;

  /* ── Fire network fetch IMMEDIATELY at parse time ── */
  var cached = readCache();
  var fetchPromise = (GROQ && !cached)
    ? fetch(
        "https://" + PROJECT_ID + ".apicdn.sanity.io/v" + API_VERSION +
        "/data/query/" + DATASET + "?query=" + encodeURIComponent(GROQ) +
        "&$slug=" + encodeURIComponent(JSON.stringify(slug))
      ).then(function (r) { return r.json(); })
    : Promise.resolve(cached ? { result: cached } : null);

  /* ── Helpers ── */
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
  function sanityImgUrl(ref, width) {
    if (!ref) return "";
    var parts = ref.split("-");
    var ext  = parts[parts.length - 1];
    var dims = parts[parts.length - 2];
    var id   = parts.slice(1, parts.length - 2).join("-");
    var base = "https://cdn.sanity.io/images/" + PROJECT_ID + "/" + DATASET + "/" + id + "-" + dims + "." + ext;
    return base + (width ? "?w=" + width + "&auto=format&fit=max" : "");
  }

  /* ── CSS class strings ── */
  var P = "c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-cOWITQ-color-gray12";
  var H = "c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-hZNfDR-weight-500 c-iLbGmI-cOWITQ-color-gray12";
  var S = "c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-jIjxDA-size-14 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-hgsrmT-color-gray11";

  /* ── Code block ── */
  function escHtml(str) {
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function buildCodeBlock(code, lang) {
    var language = lang || "code";
    var linesHtml = code.split("\n").map(function (line) {
      return '<div class="token-line codeblock_line__5uT_I">' + escHtml(line) + '</div>';
    }).join("");
    return '<div class="codeblock_root__pf0C4"><div class="' + language + ' codeblock_editor__Hq7SO">' + linesHtml + '</div></div>';
  }

  /* ── Portable Text renderer ── */
  function renderBody(blocks, tocItems) {
    if (!Array.isArray(blocks)) return "";
    var html = "";
    blocks.forEach(function (block) {
      if (!block) return;

      if (block._type === "codeBlock") {
        html += buildCodeBlock(block.code || "", block.language || "code");
        return;
      }

      if (block._type === "image") {
        var ref = block.asset && block.asset._ref;
        if (!ref) return;
        var caption = block.caption
          ? '<figcaption style="font-size:12px;color:var(--colors-gray10);text-align:center;margin-top:4px">' + esc(block.caption) + '</figcaption>'
          : "";
        html += '<figure class="c-gtuqhG" style="margin:12px 0">' +
          '<img src="' + esc(sanityImgUrl(ref, 1200)) + '" alt="' + esc(block.alt || "") + '" loading="lazy" decoding="async" style="width:100%;height:auto;display:block;border-radius:inherit">' +
          caption + '</figure>';
        return;
      }

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
      } else if (text.trim()) {
        html += '<p class="' + P + '">' + text + '</p>';
      }
    });
    return html;
  }

  function renderSpans(children, markDefs) {
    if (!Array.isArray(children)) return "";
    return children.map(function (span) {
      var text  = esc(span.text || "");
      var marks = span.marks || [];
      marks.forEach(function (mark) {
        if (mark === "strong") {
          text = "<strong>" + text + "</strong>";
        } else if (mark === "em") {
          text = "<em>" + text + "</em>";
        } else if (mark === "code") {
          text = '<code class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-gGEEru-size-12 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-hgsrmT-color-gray11 c-iLbGmI-ibeaVNb-css">' + text + '</code>';
        } else {
          var def = (markDefs || []).find(function (d) { return d._key === mark; });
          if (def && def._type === "link" && def.href) {
            text = '<a class="' + S + ' c-iLbGmI-ikkecHh-css" href="' + esc(def.href) + '" target="_blank" rel="noopener noreferrer">' + text + '</a>';
          }
        }
      });
      return text;
    }).join("");
  }

  function stripTags(html) { return html.replace(/<[^>]+>/g, ""); }

  /* ── References ── */
  function renderReferences(heading, items) {
    if (!items || !items.length) return "";
    var id   = slugify(heading || "references");
    var html = '<h3 data-heading="true" id="' + esc(id) + '" class="post-references-heading">' + esc(heading || "References") + '</h3>';
    html += '<ol class="post-references-list">';
    items.forEach(function (item) {
      html += "<li>";
      if (item && item.url) {
        html += '<a href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer">' + esc(item.text || item.url) + '</a>';
      } else {
        html += esc(item && item.text ? item.text : String(item || ""));
      }
      html += "</li>";
    });
    html += "</ol>";
    return html;
  }

  /* ── TOC sidebar ── */
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
      var active  = null;
      document.querySelectorAll("[data-toc]").forEach(function (h) {
        if (h.id && h.getBoundingClientRect().top + scrollY - 120 <= scrollY) active = h.id;
      });
      nav.querySelectorAll("a").forEach(function (a) {
        var on = a.getAttribute("href") === "#" + active;
        a.style.color      = on ? "var(--colors-gray12)" : "var(--colors-gray11)";
        a.style.fontWeight = on ? "500" : "400";
      });
    }
    window.addEventListener("scroll", updateActive, { passive: true });
    updateActive();
  }

  /* ── Prev / Next nav ── */
  function buildNav(prev, next) {
    var navEl = document.getElementById("post-nav");
    if (!navEl) return;
    var html = "";
    if (prev) {
      html += '<a class="c-bInnJf" href="?slug=' + esc(prev.slug) + '">' +
        '<div class="c-gqwkJN c-gqwkJN-ejCoEP-direction-row c-gqwkJN-jroWjL-align-center c-gqwkJN-awKDG-justify-start c-gqwkJN-kVNAnR-wrap-no-wrap c-gqwkJN-ilhikBv-css">Previous</div>' +
        '<span class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-jIjxDA-size-14 c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-cOWITQ-color-gray12">' + esc(prev.title) + '</span></a>';
    }
    if (next) {
      html += '<a class="c-bInnJf" style="margin-left:auto" href="?slug=' + esc(next.slug) + '">' +
        '<div style="margin-left:auto" class="c-gqwkJN c-gqwkJN-ejCoEP-direction-row c-gqwkJN-jroWjL-align-center c-gqwkJN-awKDG-justify-start c-gqwkJN-kVNAnR-wrap-no-wrap c-gqwkJN-ilhikBv-css">Next</div>' +
        '<span class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-jIjxDA-size-14 c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-cOWITQ-color-gray12">' + esc(next.title) + '</span></a>';
    }
    navEl.innerHTML = html;
  }

  /* ── Copy URL button ── */
  function initCopyButton() {
    var btn = document.querySelector('[aria-label="Copy URL"]');
    if (!btn) return;
    btn.addEventListener("click", function () {
      var url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(showCopied, fallback);
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = url;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); showCopied(); } catch(e) {}
        document.body.removeChild(ta);
      }
    });
    function showCopied() {
      var orig    = btn.getAttribute("aria-label");
      var svg     = btn.querySelector("svg");
      var origSvg = svg ? svg.outerHTML : "";
      btn.setAttribute("aria-label", "Copied!");
      btn.style.background = "var(--colors-gray4)";
      if (svg) svg.outerHTML = '<svg width="24px" height="24px" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      setTimeout(function () {
        btn.setAttribute("aria-label", orig);
        btn.style.background = "";
        var s = btn.querySelector("svg");
        if (s && origSvg) s.outerHTML = origSvg;
      }, 2000);
    }
  }

  /* ── Main render ── */
  function renderPost(post) {
    var title     = post.title || "Blog Post";
    var dateStr   = formatDate(post.postDate);
    var canonical = "https://www.yvesseraphin.xyz/blog/post/?slug=" + (post.slug || "");
    var coverRef  = post.coverImage && post.coverImage.asset ? post.coverImage.asset._ref : null;
    var ogImg     = coverRef ? sanityImgUrl(coverRef, 1200) : "https://www.yvesseraphin.xyz/assets/images/og.jpg";

    /* Meta */
    document.getElementById("page-title").textContent = title + " · Seraphin";
    setMeta("meta-description", post.excerpt || title);
    setMeta("og-title",        title);
    setMeta("og-description",  post.excerpt || title);
    setMeta("og-url",          canonical);
    setMeta("og-image",        ogImg);
    setMeta("og-image-alt",    title);
    var canonEl = document.getElementById("canonical");
    if (canonEl) canonEl.setAttribute("href", canonical);

    /* Header */
    var titleEl = document.getElementById("post-title");
    var dateEl  = document.getElementById("post-date");
    if (titleEl) titleEl.textContent = title;
    if (dateEl)  dateEl.textContent  = dateStr;

    /* Body — single innerHTML write = one reflow */
    var bodyEl = document.getElementById("post-body");
    if (!bodyEl) return;

    var tocItems = [];
    var bodyHtml = "";

    if (coverRef) {
      bodyHtml += '<div class="c-gtuqhG" style="margin-bottom:24px">' +
        '<img src="' + esc(sanityImgUrl(coverRef, 1200)) + '" loading="eager" decoding="async" ' +
        'alt="Cover image" style="width:100%;height:auto;display:block;border-radius:inherit"></div>';
    }

    bodyHtml += renderBody(post.body || [], tocItems);

    var refs = post.references || [];
    if (refs.length) {
      var refHeading = post.referencesHeading || "References";
      tocItems.push({ id: slugify(refHeading), label: refHeading });
      bodyHtml += renderReferences(refHeading, refs);
    }

    bodyEl.innerHTML = bodyHtml;

    buildToc(tocItems);

    var divider = document.getElementById("post-divider");
    var postNav = document.getElementById("post-nav");
    if (divider) divider.style.visibility = "";
    if (postNav) postNav.style.visibility = "";

    buildNav(post.prev || null, post.next || null);
  }

  function setMeta(id, val) {
    var el = document.getElementById(id);
    if (el) el.setAttribute("content", val || "");
  }

  /* ── Boot ── */
  function onReady(data) {
    initCopyButton();
    if (!slug || !data || !data.result) {
      var titleEl = document.getElementById("post-title");
      if (titleEl) titleEl.textContent = "Post not found";
      return;
    }
    if (!cached) writeCache(data.result);
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
