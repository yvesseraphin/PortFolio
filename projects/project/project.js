(function () {
  "use strict";

  var PROJECT_ID  = "m77bsvm1";
  var DATASET     = "production";
  var API_VERSION = "2024-01-01";

  var slug = new URLSearchParams(window.location.search).get("slug") || "";

  var CACHE_KEY = "project_cache_v3_" + slug;
  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY) || localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }
  function writeCache(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  var GROQ = slug
    ? '*[_type == "project" && slug.current == $slug][0]{' +
        'title, "slug": slug.current, year, tagline, coverImage, "body": coalesce(body, processArchitecture), references, referencesHeading,' +
        '"prev": *[_type == "project" && (order < ^.order || (order == ^.order && _createdAt < ^._createdAt))] | order(order desc, _createdAt desc)[0]{ title, "slug": slug.current },' +
        '"next": *[_type == "project" && (order > ^.order || (order == ^.order && _createdAt > ^._createdAt))] | order(order asc, _createdAt asc)[0]{ title, "slug": slug.current }' +
      "}"
    : null;

  function esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function slugify(str) {
    return String(str || "").toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
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

  var P = "c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-cOWITQ-color-gray12";
  var H = "c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-hZNfDR-weight-500 c-iLbGmI-cOWITQ-color-gray12 c-iLbGmI-ifcaOLc-css";

  function highlightCode(rawCode) {
    if (!rawCode) return "";
    var lines = rawCode.split("\n");

    return lines.map(function (line) {
      if (!line) {
        return '<div class="token-line codeblock_line__5uT_I">&nbsp;</div>';
      }

      var l = esc(line);
      var tokens = [];

      // 1. Strings
      l = l.replace(/(&quot;(?:\\.|[^&]|&(?!quot;))*&quot;|&#39;(?:\\.|[^&]|&(?!#39;))*&#39;|`(?:\\.|[^`])*`)/g, function (m) {
        var id = "___TOK_STR_" + tokens.length + "___";
        tokens.push('<span class="token string">' + m + '</span>');
        return id;
      });

      // 2. Comments
      l = l.replace(/(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/g, function (m) {
        var id = "___TOK_COM_" + tokens.length + "___";
        tokens.push('<span class="token comment">' + m + '</span>');
        return id;
      });

      // 3. Keywords
      l = l.replace(/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|new|this|super|import|export|from|async|await|try|catch|finally|throw|typeof|instanceof|in|of|interface|type|enum|public|private|protected|static|readonly|def|self|elif|lambda|pass|raise|yield|with|is|not|and|or|True|False|None|true|false|null|undefined)\b/g, '<span class="token keyword">$1</span>');

      // 4. Numbers
      l = l.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="token number">$1</span>');

      // 5. Function calls: foo(...)
      l = l.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g, '<span class="token function">$1</span>');

      // Restore protected tokens
      for (var i = 0; i < tokens.length; i++) {
        l = l.replace("___TOK_STR_" + i + "___", tokens[i]);
        l = l.replace("___TOK_COM_" + i + "___", tokens[i]);
      }

      return '<div class="token-line codeblock_line__5uT_I">' + l + '</div>';
    }).join("");
  }

  function buildCodeBlock(code, lang) {
    var language = esc(lang || "code");
    var linesHtml = highlightCode(code || "");
    return '<div class="codeblock_root__pf0C4" style="margin:24px 0"><div class="' + language + ' codeblock_editor__Hq7SO">' + linesHtml + '</div></div>';
  }

  function renderBody(blocks, tocItems) {
    if (!Array.isArray(blocks)) return "";
    var html = "";
    var currentListType = null;

    function closeList() {
      if (currentListType === "bullet") {
        html += "</ul>";
      } else if (currentListType === "number") {
        html += "</ol>";
      }
      currentListType = null;
    }

    blocks.forEach(function (block) {
      if (!block) return;

      if (block._type === "codeBlock") {
        closeList();
        html += buildCodeBlock(block.code || "", block.language || "code");
        return;
      }

      if (block._type === "image") {
        closeList();
        var ref = block.asset && block.asset._ref;
        if (!ref) return;
        var caption = block.caption
          ? '<figcaption style="font-size:12px;color:var(--colors-gray10);text-align:center;margin-top:4px">' + esc(block.caption) + '</figcaption>'
          : "";
        html += '<figure class="c-gtuqhG" style="margin:24px 0">' +
          '<img src="' + esc(sanityImgUrl(ref, 1200)) + '" alt="' + esc(block.alt || "") + '" loading="lazy" decoding="async" style="width:100%;height:auto;display:block;border-radius:inherit">' +
          caption + '</figure>';
        return;
      }

      if (block._type !== "block") {
        closeList();
        return;
      }

      var text = renderSpans(block.children || [], block.markDefs || []);

      if (block.listItem) {
        var itemType = block.listItem === "number" ? "number" : "bullet";
        if (currentListType !== itemType) {
          closeList();
          currentListType = itemType;
          if (itemType === "bullet") {
            html += '<ul class="c-lesPJm">';
          } else {
            html += '<ol class="c-lesPJm">';
          }
        }
        html += '<li class="' + P + '">' + text + '</li>';
        return;
      }

      closeList();

      var style = block.style || "normal";

      if (style === "h2") {
        var id2 = slugify(stripTags(text));
        tocItems.push({ id: id2, label: stripTags(text) });
        html += '<h2 id="' + id2 + '" data-heading="true" data-toc="true" class="' + H + '" style="margin-top:40px;margin-bottom:12px;font-size:20px;line-height:28px">' + text + '</h2>';
      } else if (style === "h3") {
        var id3 = slugify(stripTags(text));
        tocItems.push({ id: id3, label: stripTags(text) });
        html += '<h3 id="' + id3 + '" data-heading="true" data-toc="true" class="' + H + '" style="margin-top:32px;margin-bottom:10px;font-size:20px;line-height:28px">' + text + '</h3>';
      } else if (style === "blockquote") {
        html += '<blockquote class="' + P + '" style="border-left:3px solid var(--colors-gray7);padding-left:18px;margin:24px 0;font-size:17px;line-height:28px;color:var(--colors-gray12)">' + text + '</blockquote>';
      } else if (text.trim()) {
        html += '<p class="' + P + '" style="margin-bottom:16px">' + text + '</p>';
      }
    });

    closeList();
    return html;
  }

  function renderSpans(children, markDefs) {
    if (!Array.isArray(children)) return "";
    return children.map(function (span) {
      var text  = esc(span.text || "");
      var marks = span.marks || [];
      marks.forEach(function (mark) {
        if (mark === "strong") {
          text = '<strong class="medium-bold">' + text + '</strong>';
        } else if (mark === "em") {
          text = "<em>" + text + "</em>";
        } else if (mark === "code") {
          text = '<code class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-gGEEru-size-12 c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-hgsrmT-color-gray11 c-iLbGmI-ibeaVNb-css">' + text + '</code>';
        } else {
          var def = (markDefs || []).find(function (d) { return d._key === mark; });
          if (def && def._type === "link" && def.href) {
            text = '<a class="' + P + ' c-iLbGmI-ikkecHh-css" href="' + esc(def.href) + '" target="_blank" rel="noopener noreferrer">' + text + '</a>';
          }
        }
      });
      return text;
    }).join("");
  }

  function stripTags(html) { return html.replace(/<[^>]+>/g, ""); }

  function renderReferences(heading, items) {
    if (!items || !items.length) return "";
    var id   = slugify(heading || "references");
    var H3_CLS = "c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-lewMmC-size-16 c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-hZNfDR-weight-500 c-iLbGmI-cOWITQ-color-gray12 c-iLbGmI-ifcaOLc-css";
    var LINK_CLS = P + " c-iLbGmI-ikkecHh-css";
    var TEXT_CLS = P;

    var html = '<h3 data-heading="true" id="' + esc(id) + '" class="' + H3_CLS + '" style="margin-top:40px;margin-bottom:12px;font-size:20px;line-height:28px">' + esc(heading || "References") + '</h3>';
    html += '<ol class="c-lesPJm c-lesPJm-iilMZTZ-css c-lesPJm-ildRkSF-css" style="color:var(--colors-gray12);padding-left:20px;margin-top:12px">';
    items.forEach(function (item) {
      html += '<li style="color:var(--colors-gray12);margin-bottom:8px">';
      if (item && item.url) {
        html += '<a href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer" class="' + LINK_CLS + '">' + esc(item.text || item.url) + '</a>';
      } else {
        html += '<span class="' + TEXT_CLS + '">' + esc(item && item.text ? item.text : String(item || "")) + '</span>';
      }
      html += "</li>";
    });
    html += "</ol>";
    return html;
  }

  function buildToc(items) {
    var sidebar = document.getElementById("project-toc");
    if (!sidebar) return;
    var oldNav = sidebar.querySelector("nav");
    if (oldNav) oldNav.remove();
    if (!items.length) return;
    var nav = document.createElement("nav");
    nav.setAttribute("aria-label", "Table of contents");
    nav.className = "post-toc-nav";
    items.forEach(function (item) {
      var a = document.createElement("a");
      a.href = "#" + item.id;
      a.textContent = item.label;
      a.title = item.label;
      a.className = "c-gRVIZe";
      a.style.cssText = "font-size:14px;color:var(--colors-gray11);line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;max-width:190px;";
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

  function buildNav(prev, next) {
    var navEl = document.getElementById("project-nav");
    if (!navEl) return;
    var html = "";
    if (prev) {
      html += '<a class="c-bInnJf" href="/projects/project/?slug=' + esc(prev.slug) + '">' +
        '<div class="c-gqwkJN c-gqwkJN-ejCoEP-direction-row c-gqwkJN-jroWjL-align-center c-gqwkJN-awKDG-justify-start c-gqwkJN-kVNAnR-wrap-no-wrap c-gqwkJN-ilhikBv-css">Previous</div>' +
        '<span class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-jIjxDA-size-14 c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-cOWITQ-color-gray12">' + esc(prev.title) + '</span></a>';
    }
    if (next) {
      html += '<a class="c-bInnJf" style="margin-left:auto" href="/projects/project/?slug=' + esc(next.slug) + '">' +
        '<div style="margin-left:auto" class="c-gqwkJN c-gqwkJN-ejCoEP-direction-row c-gqwkJN-jroWjL-align-center c-gqwkJN-awKDG-justify-start c-gqwkJN-kVNAnR-wrap-no-wrap c-gqwkJN-ilhikBv-css">Next</div>' +
        '<span class="c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-jIjxDA-size-14 c-iLbGmI-haFyCE-lineHeight-20 c-iLbGmI-cdWBIM-weight-400 c-iLbGmI-cOWITQ-color-gray12">' + esc(next.title) + '</span></a>';
    }
    navEl.innerHTML = html;
  }

  function initCopyButton() {
    var btn = document.querySelector('[aria-label="Copy URL"]');
    if (!btn || btn.dataset.init) return;
    btn.dataset.init = "true";
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

  function renderProject(project) {
    if (!project) return;
    var title     = project.title || "Project";
    var metaText  = project.year || "";
    if (project.tagline) {
      metaText += (metaText ? " · " : "") + project.tagline;
    }
    var canonical = window.location.href;
    var coverRef  = project.coverImage && project.coverImage.asset ? project.coverImage.asset._ref : null;
    var ogImg     = coverRef ? sanityImgUrl(coverRef, 1200) : "https://www.yvesseraphin.xyz/assets/images/og.jpg";

    document.getElementById("page-title").textContent = title + " · Seraphin";
    setMeta("meta-description", project.tagline || title);
    setMeta("og-title",        title);
    setMeta("og-description",  project.tagline || title);
    setMeta("og-url",          canonical);
    setMeta("og-image",        ogImg);
    setMeta("og-image-alt",    title);
    var canonEl = document.getElementById("canonical");
    if (canonEl) canonEl.setAttribute("href", canonical);

    var titleEl = document.getElementById("project-title");
    var dateEl  = document.getElementById("project-date");
    if (titleEl) titleEl.textContent = title;
    if (dateEl)  dateEl.textContent  = metaText;

    var bodyEl = document.getElementById("project-body");
    if (!bodyEl) return;

    var tocItems = [];
    var bodyHtml = "";

    if (coverRef) {
      bodyHtml += '<div class="c-gtuqhG" style="margin-bottom:24px">' +
        '<img src="' + esc(sanityImgUrl(coverRef, 1200)) + '" fetchpriority="high" loading="eager" decoding="async" ' +
        'alt="Cover image" style="width:100%;height:auto;display:block;border-radius:inherit"></div>';
    }

    bodyHtml += renderBody(project.body || [], tocItems);

    var refs = project.references || [];
    if (refs.length) {
      var refHeading = project.referencesHeading || "References";
      tocItems.push({ id: slugify(refHeading), label: refHeading });
      bodyHtml += renderReferences(refHeading, refs);
    }

    bodyEl.innerHTML = bodyHtml;

    buildToc(tocItems);

    var divider = document.getElementById("project-divider");
    var projectNav = document.getElementById("project-nav");
    if (divider) divider.style.visibility = "";
    if (projectNav) projectNav.style.visibility = "";

    buildNav(project.prev || null, project.next || null);
  }

  function setMeta(id, val) {
    var el = document.getElementById(id);
    if (el) el.setAttribute("content", val || "");
  }

  function executeSWR() {
    initCopyButton();
    if (!slug) {
      var titleEl = document.getElementById("project-title");
      if (titleEl) titleEl.textContent = "Project not found";
      return;
    }

    var currentCached = readCache();
    if (currentCached) {
      renderProject(currentCached);
    }

    if (!GROQ) return;

    var url = "https://" + PROJECT_ID + ".apicdn.sanity.io/v" + API_VERSION +
      "/data/query/" + DATASET + "?query=" + encodeURIComponent(GROQ) +
      "&$slug=" + encodeURIComponent(JSON.stringify(slug));

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var fresh = data && data.result;
        if (!fresh) {
          if (!currentCached) {
            var titleEl = document.getElementById("project-title");
            if (titleEl) titleEl.textContent = "Project not found";
          }
          return;
        }

        var cachedStr = currentCached ? JSON.stringify(currentCached) : "";
        var freshStr  = JSON.stringify(fresh);

        if (cachedStr !== freshStr) {
          writeCache(fresh);
          renderProject(fresh);
        }
      })
      .catch(function (err) {
        console.warn("[project] Sanity fetch error:", err);
      });
  }

  if (document.getElementById("project-body")) {
    executeSWR();
  } else {
    document.addEventListener("DOMContentLoaded", executeSWR);
  }

})();
