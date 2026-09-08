(function () {
  "use strict";

  var PROJECT_ID  = "m77bsvm1";
  var DATASET     = "production";
  var API_VERSION = "2024-01-01";

  var slug = new URLSearchParams(window.location.search).get("slug") || "";

  var CACHE_KEY = "project_detail_cache_v2_" + slug;

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY) || localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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

  function highlightCode(rawCode, lang) {
    if (!rawCode) return "";
    var lines = rawCode.split("\n");

    return lines.map(function (line) {
      if (!line.trim()) {
        return '<span class="code-line">&nbsp;</span>';
      }

      var l = esc(line);
      var tokens = [];

      // 1. Strings (single, double, backticks)
      l = l.replace(/(&quot;(?:\\.|[^&]|&(?!quot;))*&quot;|&#39;(?:\\.|[^&]|&(?!#39;))*&#39;|`(?:\\.|[^`])*`)/g, function (m) {
        var id = "___TOK_STR_" + tokens.length + "___";
        tokens.push('<span class="tok-str">' + m + '</span>');
        return id;
      });

      // 2. Comments (// or # or /* */)
      l = l.replace(/(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/g, function (m) {
        var id = "___TOK_COM_" + tokens.length + "___";
        tokens.push('<span class="tok-com">' + m + '</span>');
        return id;
      });

      // 3. Keywords (JS/TS, Python, Rust, Go, etc.)
      l = l.replace(/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|new|this|super|import|export|from|async|await|try|catch|finally|throw|typeof|instanceof|in|of|interface|type|enum|public|private|protected|static|readonly|def|self|elif|lambda|pass|raise|yield|with|is|not|and|or|True|False|None|true|false|null|undefined)\b/g, '<span class="tok-kw">$1</span>');

      // 4. Numbers
      l = l.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');

      // 5. Function calls: foo(...)
      l = l.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g, '<span class="tok-fn">$1</span>');

      // Restore protected tokens
      for (var i = 0; i < tokens.length; i++) {
        l = l.replace("___TOK_STR_" + i + "___", tokens[i]);
        l = l.replace("___TOK_COM_" + i + "___", tokens[i]);
      }

      return '<span class="code-line">' + l + '</span>';
    }).join("");
  }

  window.copySnippet = function (btn) {
    var wrap = btn.closest(".codeblock-wrap");
    if (!wrap) return;
    var codeEl = wrap.querySelector("code");
    if (!codeEl) return;
    var text = codeEl.innerText || codeEl.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        var prev = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(function () {
          btn.textContent = prev;
        }, 1800);
      });
    }
  };

  function renderSpans(children, markDefs) {
    if (!Array.isArray(children)) return "";
    return children
      .map(function (span) {
        var text  = esc(span.text || "");
        var marks = span.marks || [];
        marks.forEach(function (mark) {
          if (mark === "strong") {
            text = '<strong class="medium-bold">' + text + '</strong>';
          } else if (mark === "em") {
            text = "<em>" + text + "</em>";
          } else if (mark === "code") {
            text = '<code style="font-family:var(--fonts-mono);font-size:12px;background:var(--colors-gray3);padding:2px 5px;border-radius:4px;color:var(--colors-gray12);">' + text + '</code>';
          } else {
            var def = (markDefs || []).find(function (d) { return d._key === mark; });
            if (def && def._type === "link" && def.href) {
              text = '<a href="' + esc(def.href) + '" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;text-underline-offset:3px;color:var(--colors-gray12);">' + text + '</a>';
            }
          }
        });
        return text;
      })
      .join("");
  }

  function renderBlocks(blocks) {
    if (!Array.isArray(blocks) || !blocks.length) return "";
    var html = "";
    blocks.forEach(function (block) {
      if (!block) return;

      if (block._type === "codeBlock") {
        var lang = esc(block.language || "code");
        var rawCode = block.code || "";
        var highlighted = highlightCode(rawCode, lang);
        var captionLeft = block.caption ? '<span>' + esc(block.caption) + '</span>' : '<span>' + lang + '</span>';
        var header =
          '<div class="codeblock-header">' +
            captionLeft +
            '<button type="button" class="codeblock-copy-btn" onclick="copySnippet(this)">Copy</button>' +
          '</div>';
        html += '<div class="codeblock-wrap">' + header + '<pre class="codeblock-body"><code>' + highlighted + '</code></pre></div>';
        return;
      }

      if (block._type === "image") {
        var ref = block.asset && block.asset._ref;
        if (!ref) return;
        var cap = block.caption ? '<figcaption class="architecture-figcaption">' + esc(block.caption) + '</figcaption>' : "";
        html += '<figure style="margin:24px 0;border-radius:10px;overflow:hidden;border:1px solid var(--colors-gray4);background:var(--colors-gray2);">' +
          '<img src="' + esc(sanityImgUrl(ref, 1200)) + '" alt="' + esc(block.alt || "") + '" loading="lazy" style="width:100%;height:auto;display:block;">' +
          cap +
          '</figure>';
        return;
      }

      if (block._type !== "block") return;

      var style = block.style || "normal";
      var text = renderSpans(block.children || [], block.markDefs || []);

      if (style === "h2") {
        html += '<h2 style="font-size:16px;font-weight:500;margin:32px 0 12px;color:var(--colors-gray12);line-height:24px;">' + text + '</h2>';
      } else if (style === "h3") {
        html += '<h3 style="font-size:14px;font-weight:500;margin:24px 0 10px;color:var(--colors-gray12);">' + text + '</h3>';
      } else if (style === "blockquote") {
        html += '<blockquote class="quote-block">' + text + '</blockquote>';
      } else if (text.trim()) {
        html += '<p style="margin-bottom:14px;color:var(--colors-gray12);">' + text + '</p>';
      }
    });
    return html;
  }


  function updateSeo(p) {
    if (!p) return;
    var title = (p.title || "Project") + " — Seraphin";
    var desc = p.tagline || p.problem || "Project case study and technical breakdown by Seraphin.";
    document.title = title;

    var titleEl = document.getElementById("page-title");
    if (titleEl) titleEl.textContent = title;

    var metaDesc = document.getElementById("meta-description");
    if (metaDesc) metaDesc.setAttribute("content", desc);

    var ogTitle = document.getElementById("og-title");
    if (ogTitle) ogTitle.setAttribute("content", title);

    var ogDesc = document.getElementById("og-description");
    if (ogDesc) ogDesc.setAttribute("content", desc);

    var ogUrl = document.getElementById("og-url");
    if (ogUrl) ogUrl.setAttribute("content", window.location.href);

    var canonical = document.getElementById("canonical");
    if (canonical) canonical.setAttribute("href", window.location.href);

    if (p.coverImage && p.coverImage.asset && p.coverImage.asset._ref) {
      var imgUrl = sanityImgUrl(p.coverImage.asset._ref, 1200);
      var ogImg = document.getElementById("og-image");
      if (ogImg) ogImg.setAttribute("content", imgUrl);
    }
  }

  function renderProject(p) {
    var contentEl = document.getElementById("project-content");
    if (!contentEl || !p) return;

    var titleEl = document.getElementById("project-title");
    var taglineEl = document.getElementById("project-tagline");
    if (titleEl) titleEl.textContent = p.title || "Project";
    if (taglineEl) {
      var metaText = "";
      if (p.year) metaText += p.year;
      if (p.tagline) metaText += (metaText ? " · " : "") + p.tagline;
      taglineEl.textContent = metaText;
    }

    var html = "";

    // Hero Visual
    if (p.coverImage && p.coverImage.asset && p.coverImage.asset._ref) {
      var heroImg = sanityImgUrl(p.coverImage.asset._ref, 1400);
      html += '<div class="hero-media-wrap" style="margin-top:0">';
      html += '  <img class="hero-media-img" src="' + esc(heroImg) + '" alt="' + esc(p.coverImage.alt || p.title) + '" loading="eager" decoding="async" />';
      if (p.coverImage.alt) {
        html += '  <div class="hero-media-caption">' + esc(p.coverImage.alt) + '</div>';
      }
      html += '</div>';
    }

    // ── 2. Metadata at a Glance ──
    var hasMeta = p.role || p.timeline || p.teamSize || (p.techStack && p.techStack.length);
    if (hasMeta) {
      html += '<section class="meta-grid" aria-label="Metadata at a glance">';
      if (p.role) {
        html += '<div class="meta-item">';
        html += '  <span class="meta-label">Role</span>';
        html += '  <span class="meta-val">' + esc(p.role) + '</span>';
        html += '</div>';
      }
      if (p.timeline) {
        html += '<div class="meta-item">';
        html += '  <span class="meta-label">Timeline</span>';
        html += '  <span class="meta-val">' + esc(p.timeline) + '</span>';
        html += '</div>';
      }
      if (p.teamSize) {
        html += '<div class="meta-item">';
        html += '  <span class="meta-label">Team Context</span>';
        html += '  <span class="meta-val">' + esc(p.teamSize) + '</span>';
        html += '</div>';
      }
      if (p.techStack && p.techStack.length) {
        html += '<div class="meta-item meta-item--span-all">';
        html += '  <span class="meta-label">Core Tech Stack</span>';
        html += '  <div class="tech-pills">';
        p.techStack.forEach(function (tech) {
          html += '    <span class="tech-pill">' + esc(tech) + '</span>';
        });
        html += '  </div>';
        html += '</div>';
      }
      html += '</section>';
    }

    // ── 3. The Problem & Objective ──
    if (p.problem || p.targetUser || p.goal) {
      html += '<section class="section-block">';
      html += '  <h2 class="section-title">01 / The Problem &amp; Objective</h2>';
      html += '  <div class="problem-cards">';
      if (p.problem) {
        html += '    <div class="problem-card">';
        html += '      <div class="problem-card-title">';
        html += '        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';
        html += '        The Problem';
        html += '      </div>';
        html += '      <p class="problem-card-text">' + esc(p.problem) + '</p>';
        html += '    </div>';
      }
      if (p.targetUser) {
        html += '    <div class="problem-card">';
        html += '      <div class="problem-card-title">';
        html += '        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
        html += '        Target User';
        html += '      </div>';
        html += '      <p class="problem-card-text">' + esc(p.targetUser) + '</p>';
        html += '    </div>';
      }
      if (p.goal) {
        html += '    <div class="problem-card">';
        html += '      <div class="problem-card-title">';
        html += '        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>';
        html += '        The Objective &amp; Goal';
        html += '      </div>';
        html += '      <p class="problem-card-text">' + esc(p.goal) + '</p>';
        html += '    </div>';
      }
      html += '  </div>';
      html += '</section>';
    }

    // ── 4. Your Direct Contribution ──
    if (p.directContribution && p.directContribution.length) {
      html += '<section class="section-block">';
      html += '  <h2 class="section-title">02 / Direct Contributions &amp; Ownership</h2>';
      html += '  <div class="contribution-box">';
      html += '    <ul class="contribution-list">';
      p.directContribution.forEach(function (contrib) {
        html += '      <li>';
        html += '        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
        html += '        <span>' + esc(contrib) + '</span>';
        html += '      </li>';
      });
      html += '    </ul>';
      html += '  </div>';
      html += '</section>';
    }

    // ── 5. Process & Architecture ──
    var archHtml = renderBlocks(p.processArchitecture);
    if (archHtml) {
      html += '<section class="section-block">';
      html += '  <h2 class="section-title">03 / Process &amp; Architecture</h2>';
      html += '  <div class="architecture-body">' + archHtml + '</div>';
      html += '</section>';
    }

    // ── 6. Key Challenges & Trade-offs ──
    if (p.challenges && p.challenges.length) {
      html += '<section class="section-block">';
      html += '  <h2 class="section-title">04 / Key Challenges &amp; Trade-offs</h2>';
      html += '  <div class="challenges-list">';
      p.challenges.forEach(function (ch) {
        html += '    <div class="challenge-card">';
        html += '      <div class="challenge-title">' + esc(ch.title) + '</div>';
        html += '      <div class="challenge-row">';
        html += '        <div class="challenge-subblock">';
        html += '          <span class="challenge-subblock-tag">The Roadblock</span>';
        html += '          <span class="challenge-subblock-text">' + esc(ch.roadblock) + '</span>';
        html += '        </div>';
        html += '        <div class="challenge-subblock">';
        html += '          <span class="challenge-subblock-tag">Resolution &amp; Trade-off</span>';
        html += '          <span class="challenge-subblock-text">' + esc(ch.tradeoff) + '</span>';
        html += '        </div>';
        html += '      </div>';
        html += '    </div>';
      });
      html += '  </div>';
      html += '</section>';
    }

    // ── 7. Results & Impact ──
    var hasMetrics = p.metrics && p.metrics.length;
    if (hasMetrics || p.impactSummary) {
      html += '<section class="section-block">';
      html += '  <h2 class="section-title">05 / Results &amp; Impact</h2>';
      if (hasMetrics) {
        html += '  <div class="metrics-grid">';
        p.metrics.forEach(function (m) {
          html += '    <div class="metric-card">';
          html += '      <div class="metric-num">' + esc(m.value) + '</div>';
          html += '      <div class="metric-lbl">' + esc(m.label) + '</div>';
          if (m.description) {
            html += '      <div class="metric-desc">' + esc(m.description) + '</div>';
          }
          html += '    </div>';
        });
        html += '  </div>';
      }
      if (p.impactSummary) {
        html += '  <div class="impact-summary-text">' + esc(p.impactSummary) + '</div>';
      }
      html += '</section>';
    }

    // ── 8. Artifacts & Links ──
    var hasArtifacts = p.liveDemoUrl || p.githubUrl || p.docsUrl || p.designSpecsUrl;
    if (hasArtifacts) {
      html += '<section class="section-block">';
      html += '  <h2 class="section-title">06 / Artifacts &amp; Links</h2>';
      html += '  <div class="artifacts-btns">';
      if (p.liveDemoUrl) {
        html += '    <a href="' + esc(p.liveDemoUrl) + '" target="_blank" rel="noopener noreferrer" class="artifact-btn artifact-btn--primary">';
        html += '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
        html += '      Live Demo';
        html += '    </a>';
      }
      if (p.githubUrl) {
        html += '    <a href="' + esc(p.githubUrl) + '" target="_blank" rel="noopener noreferrer" class="artifact-btn">';
        html += '      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.475 2 2 6.475 2 12a9.994 9.994 0 006.838 9.488c.5.087.687-.213.687-.476 0-.237-.013-1.024-.013-1.862-2.512.463-3.162-.612-3.362-1.175-.113-.288-.6-1.175-1.025-1.413-.35-.187-.85-.65-.013-.662.788-.013 1.35.725 1.538 1.025.9 1.512 2.338 1.087 2.912.825.088-.65.35-1.087.638-1.337-2.225-.25-4.55-1.113-4.55-4.938 0-1.088.387-1.987 1.025-2.688-.1-.25-.45-1.275.1-2.65 0 0 .837-.262 2.75 1.026a9.28 9.28 0 012.5-.338c.85 0 1.7.112 2.5.337 1.912-1.3 2.75-1.024 2.75-1.024.55 1.375.2 2.4.1 2.65.637.7 1.025 1.587 1.025 2.687 0 3.838-2.337 4.688-4.562 4.938.362.312.675.912.675 1.85 0 1.337-.013 2.412-.013 2.75 0 .262.188.574.688.474A10.016 10.016 0 0022 12c0-5.525-4.475-10-10-10z"/></svg>';
        html += '      Source Code';
        html += '    </a>';
      }
      if (p.docsUrl) {
        html += '    <a href="' + esc(p.docsUrl) + '" target="_blank" rel="noopener noreferrer" class="artifact-btn">';
        html += '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
        html += '      Documentation';
        html += '    </a>';
      }
      if (p.designSpecsUrl) {
        html += '    <a href="' + esc(p.designSpecsUrl) + '" target="_blank" rel="noopener noreferrer" class="artifact-btn">';
        html += '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"/><path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"/><path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z"/><path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z"/><path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"/></svg>';
        html += '      Design Specs';
        html += '    </a>';
      }
      html += '  </div>';
      html += '</section>';
    }

    contentEl.innerHTML = html;

    // ── Divider (matching blog post) ──
    var dividerEl = document.getElementById("project-divider");
    if (dividerEl) dividerEl.style.display = "";

    // ── Pagination Footer (matching blog post) ──
    var paginationEl = document.getElementById("project-pagination");
    if (paginationEl && (p.prev || p.next)) {
      var navHtml = "";
      if (p.prev) {
        navHtml += '<a class="project-nav-item" href="/projects/project/?slug=' + esc(p.prev.slug) + '">';
        navHtml += '  <div class="project-nav-label">&larr; Previous</div>';
        navHtml += '  <span class="project-nav-title">' + esc(p.prev.title) + '</span>';
        navHtml += '</a>';
      } else {
        navHtml += '<div></div>';
      }
      if (p.next) {
        navHtml += '<a class="project-nav-item" style="margin-left:auto;text-align:right" href="/projects/project/?slug=' + esc(p.next.slug) + '">';
        navHtml += '  <div class="project-nav-label" style="margin-left:auto">Next &rarr;</div>';
        navHtml += '  <span class="project-nav-title">' + esc(p.next.title) + '</span>';
        navHtml += '</a>';
      }
      paginationEl.innerHTML = navHtml;
      paginationEl.style.display = "flex";
    }
  }

  function initCopyButton() {
    var btn = document.getElementById("btn-copy-url");
    if (!btn || btn.dataset.init) return;
    btn.dataset.init = "true";
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
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          showCopied();
        } catch (e) {}
        document.body.removeChild(ta);
      }
    });

    function showCopied() {
      var orig = btn.getAttribute("aria-label");
      var svg = btn.querySelector("svg");
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

  function renderNotFound(msg) {
    var titleEl = document.getElementById("project-title");
    var taglineEl = document.getElementById("project-tagline");
    if (titleEl) titleEl.textContent = msg || "Project not found";
    if (taglineEl) taglineEl.textContent = "";

    var contentEl = document.getElementById("project-content");
    if (contentEl) contentEl.innerHTML = "";
  }

  var DEFAULT_PROJECT_DETAILS = {
    "ai-powered-chatbot": {
      title: "AI-Powered Chatbot",
      slug: "ai-powered-chatbot",
      tagline: "Conversational assistant built on transformer models",
      year: "2025",
      role: "AI & Full-Stack Engineer",
      timeline: "3 months (2025)",
      teamSize: "Solo Project",
      techStack: ["Python", "PyTorch", "FastAPI", "Transformers", "React", "Docker"],
      problem: "Standard chatbots suffer from poor context retention across multi-turn dialogues and slow inference times under resource constraints.",
      targetUser: "Users and developers needing an intelligent, contextual virtual assistant for research and workflow automation.",
      goal: "Deliver a responsive, context-aware conversational agent with streaming response generation and efficient memory utilization.",
      directContribution: [
        "Designed the conversational state pipeline using quantized transformer models for fast local inference.",
        "Implemented real-time token streaming using Server-Sent Events (SSE) and FastAPI.",
        "Created a minimalist, distraction-free chat interface with instant keyboard shortcuts.",
        "Benchmarked prompt caching strategies, cutting redundant latency by over 40%."
      ],
      challenges: [
        {
          title: "Inference Latency vs. Model Depth",
          roadblock: "High-parameter transformer models caused 1.8s delay per response, hurting conversational fluidity.",
          tradeoff: "Adopted 4-bit INT4 quantization and KV cache pruning, dropping response latency to under 220ms with negligible loss in coherence."
        }
      ],
      metrics: [
        { value: "< 220ms", label: "Time to First Token", description: "Perceived response speed" },
        { value: "32k", label: "Context Window", description: "Multi-turn dialogue depth" },
        { value: "40%", label: "Latency Reduction", description: "Achieved via prompt caching" }
      ],
      impactSummary: "Delivered instant sub-250ms token streaming with robust contextual multi-turn memory and zero runtime crashes.",
      githubUrl: "https://github.com/yvesseraphin",
      prev: { title: "DevConnect", slug: "devconnect" },
      next: { title: "SecureVault", slug: "securevault" }
    },
    "securevault": {
      title: "SecureVault",
      slug: "securevault",
      tagline: "End-to-end encrypted password manager with zero-knowledge architecture",
      year: "2025",
      role: "Security & Systems Engineer",
      timeline: "4 months (2025)",
      teamSize: "Solo Project",
      techStack: ["Rust", "TypeScript", "WebCrypto API", "Argon2id", "AES-256-GCM", "SQLite"],
      problem: "Centralized credential storage presents catastrophic risk if master databases are compromised or if servers can inspect plaintexts.",
      targetUser: "Security-conscious developers and teams requiring uncompromising zero-knowledge secret management.",
      goal: "Construct a zero-knowledge password and secret manager where cryptographic keys never leave the client device in unencrypted form.",
      directContribution: [
        "Designed zero-knowledge key derivation using Argon2id with salted master keys on the client.",
        "Implemented AES-256-GCM symmetric encryption for credential payloads before any network dispatch.",
        "Built local-first encrypted offline caching with cryptographic tamper detection.",
        "Developed automated breach checking with k-anonymity SHA-1 hash lookups."
      ],
      challenges: [
        {
          title: "Client-Side Cryptographic Overhead",
          roadblock: "Deriving keys with Argon2id parameters (memory-hard) temporarily blocked the main browser thread on mobile devices.",
          tradeoff: "Moved Argon2 key derivation into Web Workers with WebAssembly compilation, keeping UI interactions at a steady 60 FPS."
        }
      ],
      metrics: [
        { value: "0", label: "Plaintext Leaks", description: "Zero-knowledge client encryption" },
        { value: "256-bit", label: "AES-GCM", description: "Authenticated cryptographic cipher" },
        { value: "100%", label: "Offline Access", description: "Encrypted IndexedDB/SQLite sync" }
      ],
      impactSummary: "Engineered zero-leak client-side encryption ensuring zero server-side plaintext exposure under any threat model.",
      githubUrl: "https://github.com/yvesseraphin",
      prev: { title: "AI-Powered Chatbot", slug: "ai-powered-chatbot" },
      next: { title: "RCA Learning Platform", slug: "rca-learning-platform" }
    },
    "rca-learning-platform": {
      title: "RCA Learning Platform",
      slug: "rca-learning-platform",
      tagline: "Full-stack LMS for Rwanda Coding Academy students",
      year: "2024",
      role: "Lead Full-Stack Developer",
      timeline: "6 months (2024)",
      teamSize: "4 Engineers",
      techStack: ["Node.js", "Express", "React", "PostgreSQL", "Docker", "Redis"],
      problem: "Existing legacy educational portals suffered from disjointed assignment hand-ins, slow grading feedback, and lack of code execution sandboxes.",
      targetUser: "Students, teaching assistants, and faculty at Rwanda Coding Academy.",
      goal: "Create a modern, unified learning management system tailored to coding curricula, automated grading, and real-time announcements.",
      directContribution: [
        "Architected the relational schema for courses, submissions, automated grading rubrics, and role-based permissions.",
        "Implemented secure automated sandbox code evaluation with memory and CPU limiters.",
        "Engineered WebSocket notification infrastructure for instant teacher feedback and grade publishing.",
        "Spearheaded database optimization and indexing, reducing peak lecture loading times from 3.2s to 350ms."
      ],
      challenges: [
        {
          title: "Untrusted Code Execution",
          roadblock: "Allowing students to run arbitrary code submissions created severe server security and resource exhaustion risks.",
          tradeoff: "Isolated execution inside ephemeral rootless Docker containers with cgroup resource boundaries and disabled network interfaces."
        }
      ],
      metrics: [
        { value: "100%", label: "Submission Reliability", description: "Zero lost assignments across cohorts" },
        { value: "350ms", label: "Page Load Time", description: "Down from 3.2s on peak days" },
        { value: "80%", label: "Faster Grading", description: "Automated test runner pipeline" }
      ],
      impactSummary: "Adopted across cohorts with 100% assignment submission reliability and over 80% reduction in grading turn-around time.",
      githubUrl: "https://github.com/yvesseraphin",
      prev: { title: "SecureVault", slug: "securevault" },
      next: { title: "Intrusion Detection System", slug: "intrusion-detection-system" }
    },
    "intrusion-detection-system": {
      title: "Intrusion Detection System",
      slug: "intrusion-detection-system",
      tagline: "ML-based network anomaly detection for real-time threat analysis",
      year: "2024",
      role: "Security Analyst & ML Engineer",
      timeline: "4 months (2024)",
      teamSize: "2 Engineers",
      techStack: ["Python", "Scikit-Learn", "Packet Capture (pcap)", "Pandas", "Flask", "InfluxDB"],
      problem: "Traditional signature-based firewalls fail against zero-day exploits, volumetric scanning variants, and stealthy low-frequency lateral intrusions.",
      targetUser: "Network administrators and cybersecurity response teams monitoring campus and enterprise infrastructure.",
      goal: "Build an automated, real-time anomaly detection pipeline trained on packet flow heuristics to flag suspicious activity with minimal false positives.",
      directContribution: [
        "Extracted statistical flow features (packet inter-arrival times, payload entropy, protocol anomalies) from raw pcap streams.",
        "Trained and tuned Random Forest and Isolation Forest models on network intrusion benchmarks.",
        "Engineered an alert dispatch queue with configurable threat-severity score thresholds.",
        "Developed a dashboard visualizing flow throughput and anomaly spikes in real-time."
      ],
      challenges: [
        {
          title: "Class Imbalance in Traffic Datasets",
          roadblock: "Normal benign network traffic comprised 99.4% of samples, causing baseline models to miss stealthy intrusion events.",
          tradeoff: "Employed SMOTE oversampling alongside cost-sensitive decision thresholding to prioritize malicious recall without ballooning false alarms."
        }
      ],
      metrics: [
        { value: "97.4%", label: "Detection Accuracy", description: "On test evaluation benchmarks" },
        { value: "< 1.2%", label: "False Positive Rate", description: "Minimizes alert fatigue for admins" },
        { value: "Real-time", label: "Packet Inspection", description: "Continuous stream processing" }
      ],
      impactSummary: "Achieved 97.4% detection accuracy on test evaluation benchmarks with under 1.2% false alarm rate.",
      githubUrl: "https://github.com/yvesseraphin",
      prev: { title: "RCA Learning Platform", slug: "rca-learning-platform" },
      next: { title: "AgriSense", slug: "agrisense" }
    },
    "agrisense": {
      title: "AgriSense",
      slug: "agrisense",
      tagline: "IoT + ML crop monitoring system for smallholder farmers",
      year: "2024",
      role: "IoT Hardware & Backend Engineer",
      timeline: "5 months (2024)",
      teamSize: "3 Engineers",
      techStack: ["ESP32", "C++", "MQTT", "Python", "FastAPI", "TensorFlow Lite"],
      problem: "Smallholder farmers lack access to precision soil metrics and microclimate forecasting, leading to unpredictable crop yields and over-irrigation.",
      targetUser: "Agricultural cooperatives, extension workers, and local farming communities.",
      goal: "Deploy low-cost solar-powered IoT sensor nodes that stream soil moisture, temperature, and environmental telemetry to an advisory engine.",
      directContribution: [
        "Programmed ESP32 firmware for ultra-low power sleep cycles, maximizing solar battery autonomy.",
        "Designed MQTT telemetry pipeline with resilient offline queueing and lightweight payloads.",
        "Integrated ML pest and humidity forecasting models to send proactive SMS/app alerts to farmers.",
        "Crafted field testing prototypes calibrated against regional soil compositions."
      ],
      challenges: [
        {
          title: "Intermittent Rural Connectivity",
          roadblock: "Remote agricultural sites frequently suffered cellular dropouts lasting hours or days.",
          tradeoff: "Engineered local flash-memory ring buffers on the ESP32 to store sensor readings locally, batch-syncing once signal returned."
        }
      ],
      metrics: [
        { value: "28%", label: "Water Savings", description: "Demonstrated during trial cycles" },
        { value: "3+ weeks", label: "Battery Life", description: "Deep sleep duty-cycle optimization" },
        { value: "99.2%", label: "Data Delivery", description: "Resilient offline store-and-forward" }
      ],
      impactSummary: "Demonstrated 28% water savings during trial irrigation cycles and provided timely fungal blight warnings.",
      githubUrl: "https://github.com/yvesseraphin",
      prev: { title: "Intrusion Detection System", slug: "intrusion-detection-system" },
      next: { title: "Portfolio v2", slug: "portfolio-v2" }
    },
    "portfolio-v2": {
      title: "Portfolio v2",
      slug: "portfolio-v2",
      tagline: "Personal site with interactive UI, blog, and Sanity CMS",
      year: "2024",
      role: "Designer & Frontend Engineer",
      timeline: "Ongoing (2024 - 2025)",
      teamSize: "Solo Project",
      techStack: ["HTML5", "Vanilla CSS", "JavaScript", "Sanity CMS", "Vercel"],
      problem: "Standard portfolio templates feel heavy, rigid, and slow, frequently relying on heavyweight frameworks that hinder custom micro-interactions.",
      targetUser: "Engineers, hiring managers, collaborators, and tech enthusiasts visiting my personal corner on the web.",
      goal: "Create a timeless, ultra-fast, macOS-inspired personal site with a physical dock, dark/light modes, seamless CMS integration, and zero bloat.",
      directContribution: [
        "Crafted bespoke CSS token system and physics-based magnification dock inspired by macOS.",
        "Architected headless Sanity integration with multi-tier browser caching for instant page transitions.",
        "Built accessible keyboard navigation, seamless theme persistence, and smooth underline sweep animations.",
        "Achieved a perfect 100 Lighthouse performance score with zero external runtime dependencies."
      ],
      challenges: [
        {
          title: "Parabolic Dock Magnification Performance",
          roadblock: "Calculating dynamic transform scales on mousemove caused layout recalculations and jank on lower-powered devices.",
          tradeoff: "Replaced layout property mutations with GPU-accelerated CSS custom properties and will-change: transform hints."
        }
      ],
      metrics: [
        { value: "100", label: "Lighthouse Score", description: "Performance, Accessibility & SEO" },
        { value: "0ms", label: "Perceived Latency", description: "Instant local cache hydration" },
        { value: "0", label: "Dependencies", description: "100% vanilla HTML/CSS/JS core" }
      ],
      impactSummary: "Delivered instant 0ms perceived page loads, 100% responsive fluid layouts, and effortless CMS content publishing.",
      githubUrl: "https://github.com/yvesseraphin",
      prev: { title: "AgriSense", slug: "agrisense" },
      next: { title: "Embedded Morse Decoder", slug: "embedded-morse-decoder" }
    },
    "embedded-morse-decoder": {
      title: "Embedded Morse Decoder",
      slug: "embedded-morse-decoder",
      tagline: "Hardware decoder using STM32 microcontroller and UART output",
      year: "2023",
      role: "Embedded Systems Engineer",
      timeline: "2 months (2023)",
      teamSize: "Solo Project",
      techStack: ["C", "STM32", "ARM Cortex-M", "FreeRTOS", "UART"],
      problem: "Interpreting human telegraph keying in real-time requires handling noisy analog contact bouncing, variable cadence, and human timing jitter.",
      targetUser: "Amateur radio operators, embedded hardware enthusiasts, and audio signaling hobbyists.",
      goal: "Build a standalone microcontroller device capable of sampling audio/key input, filtering debounce noise, decoding Morse code, and outputting ASCII over UART.",
      directContribution: [
        "Implemented timer-interrupt-based input capture to calculate adaptive dit/dah timing thresholds.",
        "Designed software debouncing filters to eliminate mechanical contact noise.",
        "Created binary tree search lookup for fast O(1) character decoding into ASCII strings.",
        "Wrote clean HAL drivers for UART transmission and status LED indication."
      ],
      challenges: [
        {
          title: "Adaptive Speed Tracking",
          roadblock: "Operators naturally change their keying speed over time, which broke static timing thresholds.",
          tradeoff: "Designed a moving-average tracking filter that continuously adjusts the dit unit reference based on the last 8 valid pulses."
        }
      ],
      metrics: [
        { value: "5 - 30", label: "WPM Range", description: "Words per minute decoding capacity" },
        { value: "O(1)", label: "Lookup Complexity", description: "Binary decision tree structure" },
        { value: "< 2ms", label: "UART Latency", description: "Immediate character dispatch" }
      ],
      impactSummary: "Accurately decoded Morse signals ranging from 5 to 30 WPM with high noise immunity.",
      githubUrl: "https://github.com/yvesseraphin",
      prev: { title: "Portfolio v2", slug: "portfolio-v2" },
      next: { title: "Mini OS Kernel", slug: "mini-os-kernel" }
    },
    "mini-os-kernel": {
      title: "Mini OS Kernel",
      slug: "mini-os-kernel",
      tagline: "Bare-metal kernel with process scheduling and memory management",
      year: "2023",
      role: "Systems Programmer",
      timeline: "3 months (2023)",
      teamSize: "Solo Project",
      techStack: ["C", "x86 Assembly", "QEMU", "GDB", "Make"],
      problem: "Understanding high-level OS behavior requires mastering lower-level machine abstractions: interrupt vectors, paging, and preemption.",
      targetUser: "Computer systems researchers and students studying operating systems architecture.",
      goal: "Develop a basic 32-bit x86 monolithic kernel from scratch, booting via GRUB Multiboot specification.",
      directContribution: [
        "Wrote x86 bootloader assembly routines and initialized Global Descriptor Table (GDT) and Interrupt Descriptor Table (IDT).",
        "Implemented a round-robin cooperative and preemptive timer-driven task scheduler.",
        "Built physical frame allocator and virtual paging memory manager with basic kmalloc implementation.",
        "Constructed VGA text-mode driver with scrollback buffer and keyboard scan-code parser."
      ],
      challenges: [
        {
          title: "Page Fault Handling in Virtual Memory",
          roadblock: "Incorrect page-directory identity mapping caused triple-fault reboot loops when enabling the CR0 paging bit.",
          tradeoff: "Carefully mapped the lower 4MB to identity memory and the higher-half at 0xC0000000 before switching CPU control registers."
        }
      ],
      metrics: [
        { value: "32-bit", label: "x86 Architecture", description: "Protected mode bare-metal" },
        { value: "Preemptive", label: "Scheduler", description: "PIT timer interrupt slicing" },
        { value: "4KB", label: "Page Granularity", description: "Virtual memory management" }
      ],
      impactSummary: "Successfully booted on bare-metal and QEMU, executing multiple concurrent user-mode threads and system calls.",
      githubUrl: "https://github.com/yvesseraphin",
      prev: { title: "Embedded Morse Decoder", slug: "embedded-morse-decoder" },
      next: { title: "Sign Language Translator", slug: "sign-language-translator" }
    },
    "sign-language-translator": {
      title: "Sign Language Translator",
      slug: "sign-language-translator",
      tagline: "Computer vision model that recognizes Rwandan Sign Language gestures",
      year: "2023",
      role: "Computer Vision & ML Engineer",
      timeline: "4 months (2023)",
      teamSize: "2 Engineers",
      techStack: ["Python", "OpenCV", "MediaPipe", "TensorFlow", "Tkinter"],
      problem: "Deaf and hard-of-hearing individuals frequently face communication barriers due to the scarcity of real-time sign language translators in daily service counters.",
      targetUser: "Deaf community members, service agents, and educators in Rwanda.",
      goal: "Develop a vision-based gesture recognition pipeline that captures hand landmarks in real-time and translates them into text and speech.",
      directContribution: [
        "Collected and annotated a dataset of Rwandan Sign Language alphabets and common conversational phrases.",
        "Extracted 21 hand landmark coordinate vectors using MediaPipe to keep the pipeline lightweight on CPU.",
        "Trained an LSTM classification model for dynamic gestures and multi-frame sequences.",
        "Integrated text-to-speech synthesis for seamless bi-directional dialogue."
      ],
      challenges: [
        {
          title: "Dynamic Lighting & Background Clutter",
          roadblock: "Direct pixel-based convolutional models struggled in varied lighting environments and cluttered backgrounds.",
          tradeoff: "Abstracted hand pixels into 3D skeletal landmark coordinates using MediaPipe before training the LSTM classifier, ensuring 100% lighting invariance."
        }
      ],
      metrics: [
        { value: "94%", label: "Real-time Accuracy", description: "Across 25 distinct sign classes" },
        { value: "30 FPS", label: "Inference Speed", description: "Runs on standard laptop CPU" },
        { value: "< 100ms", label: "Speech Latency", description: "Instant text-to-speech feedback" }
      ],
      impactSummary: "Achieved 94% real-time accuracy running at 30 FPS on standard webcam hardware without requiring a dedicated GPU.",
      githubUrl: "https://github.com/yvesseraphin",
      prev: { title: "Mini OS Kernel", slug: "mini-os-kernel" },
      next: { title: "DevConnect", slug: "devconnect" }
    },
    "devconnect": {
      title: "DevConnect",
      slug: "devconnect",
      tagline: "Developer networking platform with real-time chat and project matching",
      year: "2022",
      role: "Full-Stack Developer",
      timeline: "3 months (2022)",
      teamSize: "Solo Project",
      techStack: ["JavaScript", "Node.js", "Socket.io", "MongoDB", "Express", "CSS3"],
      problem: "Early-career developers often struggle to find peers with complementary skill sets to collaborate on open-source projects or hackathons.",
      targetUser: "Student developers, open-source contributors, and hackathon participants.",
      goal: "Build an interactive community hub featuring skill-tagged developer profiles, project showcase boards, and real-time private/channel messaging.",
      directContribution: [
        "Implemented real-time bidirectional messaging rooms using Socket.io and Node.js.",
        "Designed MongoDB schemas with indexing on developer tech stacks and project availability status.",
        "Created user authentication with JWT, bcrypt password hashing, and profile portfolio linking.",
        "Engineered an instant search filter allowing users to discover teammates by language or framework."
      ],
      challenges: [
        {
          title: "Connection Re-establishment & Message Drops",
          roadblock: "Flaky network connections caused socket drops where messages sent during reconnect phases were permanently lost.",
          tradeoff: "Implemented client-side pending message queues with monotonic sequencing IDs and server acknowledgment handshakes."
        }
      ],
      metrics: [
        { value: "50+", label: "Teams Formed", description: "For hackathons and OSS projects" },
        { value: "< 50ms", label: "Message Delivery", description: "Low-latency WebSocket channel" },
        { value: "100%", label: "Message Delivery", description: "Zero dropped messages via ack queue" }
      ],
      impactSummary: "Facilitated over 50 developer team formations and active collaboration rooms across hackathons.",
      githubUrl: "https://github.com/yvesseraphin",
      prev: { title: "Sign Language Translator", slug: "sign-language-translator" },
      next: { title: "AI-Powered Chatbot", slug: "ai-powered-chatbot" }
    }
  };

  // Aliases for slug tolerance
  DEFAULT_PROJECT_DETAILS["rca-lms"] = DEFAULT_PROJECT_DETAILS["rca-learning-platform"];
  DEFAULT_PROJECT_DETAILS["ids"] = DEFAULT_PROJECT_DETAILS["intrusion-detection-system"];

  // ── Main Controller ──
  if (!slug) {
    renderNotFound("Project not found");
    return;
  }

  initCopyButton();

  // Instant render: check cache first, then default project details
  var defaultProject = DEFAULT_PROJECT_DETAILS[slug] || null;
  var cached = readCache();
  var initialProject = cached || defaultProject;

  if (initialProject) {
    updateSeo(initialProject);
    renderProject(initialProject);
  }

  var groq =
    '*[_type == "project" && slug.current == $slug][0]{' +
    '  title, "slug": slug.current, tagline, year, order, coverImage, role, timeline, teamSize, techStack,' +
    '  problem, targetUser, goal, directContribution, processArchitecture, challenges, metrics, impactSummary,' +
    '  liveDemoUrl, githubUrl, docsUrl, designSpecsUrl,' +
    '  "prev": *[_type == "project" && (order < ^.order || (order == ^.order && _createdAt < ^._createdAt))] | order(order desc, _createdAt desc)[0]{ title, "slug": slug.current },' +
    '  "next": *[_type == "project" && (order > ^.order || (order == ^.order && _createdAt > ^._createdAt))] | order(order asc, _createdAt asc)[0]{ title, "slug": slug.current }' +
    '}';

  var url =
    "https://" + PROJECT_ID + ".apicdn.sanity.io/v" + API_VERSION +
    "/data/query/" + DATASET +
    "?query=" + encodeURIComponent(groq) +
    "&%24slug=" + encodeURIComponent('"' + slug + '"');

  fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error("Fetch failed: " + r.status);
      return r.json();
    })
    .then(function (data) {
      var project = data && data.result;
      if (project) {
        writeCache(project);
        updateSeo(project);
        renderProject(project);
      } else if (!cached && !defaultProject) {
        renderNotFound("Project not found");
      }
    })
    .catch(function (err) {
      console.warn("[project detail] Sanity error:", err);
      if (!cached && !defaultProject) {
        renderNotFound("Project not found");
      }
    });
})();
