(() => {
  // tools/media/scripts/share-account-core.mjs
  var DOUYIN_HOSTS = /* @__PURE__ */ new Set(["douyin.com", "www.douyin.com", "v.douyin.com", "iesdouyin.com", "www.iesdouyin.com"]);
  var INPUT_LIMIT = 8192;
  function validateDouyinUrl(value) {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error("\u94FE\u63A5\u683C\u5F0F\u4E0D\u6B63\u786E\uFF0C\u8BF7\u7C98\u8D34\u5B8C\u6574\u7684\u6296\u97F3\u5206\u4EAB\u94FE\u63A5\u3002");
    }
    if (url.protocol !== "https:" || !DOUYIN_HOSTS.has(url.hostname) || url.username || url.password || url.port || url.href.length > INPUT_LIMIT) {
      throw new Error("\u5F53\u524D\u4EC5\u652F\u6301 HTTPS \u6296\u97F3\u94FE\u63A5\uFF08douyin.com / iesdouyin.com\uFF09\uFF0C\u4E0D\u652F\u6301\u5176\u4ED6\u57DF\u540D\u3002");
    }
    url.hash = "";
    return url;
  }
  function extractShareUrl(input) {
    const text = String(input ?? "").trim();
    if (!text || text.length > INPUT_LIMIT) throw new Error("\u8BF7\u7C98\u8D34\u5206\u4EAB\u94FE\u63A5\u6216\u5B8C\u6574\u5206\u4EAB\u6587\u6848\uFF0C\u6700\u591A 8,192 \u4E2A\u5B57\u7B26\u3002");
    const matches = text.match(/https?:\/\/[^\s<>“”「」]+/gi) || [];
    if (matches.length !== 1) throw new Error(matches.length ? "\u68C0\u6D4B\u5230\u591A\u6761\u94FE\u63A5\uFF0C\u8BF7\u6BCF\u6B21\u53EA\u89E3\u6790\u4E00\u6761\uFF0C\u907F\u514D\u6DF7\u6DC6\u8D26\u53F7\u6765\u6E90\u3002" : "\u6CA1\u6709\u627E\u5230\u94FE\u63A5\uFF0C\u8BF7\u7C98\u8D34\u5305\u542B https:// \u7684\u5B8C\u6574\u5206\u4EAB\u6587\u6848\u3002");
    return validateDouyinUrl(matches[0].replace(/[。，、！!？）)；;"']+$/u, "")).href;
  }
  var explicitSharer = /* @__PURE__ */ new Set(["share_uid", "share_user_id", "sharer_uid", "share_sec_uid", "share_sec_user_id"]);
  var account = /* @__PURE__ */ new Set(["sec_uid", "sec_user_id", "uid", "user_id"]);
  var author = /* @__PURE__ */ new Set(["author_id", "author_user_id", "author_sec_uid"]);
  var tracking = /* @__PURE__ */ new Set(["u_code", "share_id", "share_link_id", "share_sign", "share_token", "share_track_info", "share_video_id", "share_item_id"]);
  var device = /* @__PURE__ */ new Set(["did", "sec_did", "iid", "device_id", "install_id", "with_sec_did"]);
  function describe(key) {
    if (key === "activity_info") return ["tracking", "\u5206\u4EAB\u6D3B\u52A8\u4FE1\u606F", "\u5C55\u5F00 JSON \u4E2D\u7684 social_share_user_id \u8BFB\u53D6\u5206\u4EAB\u4EBA UID\uFF1Bsocial_author_id \u5355\u72EC\u8868\u793A\u4F5C\u8005\u3002"];
    if (explicitSharer.has(key)) return ["candidate", "\u5F85\u6838\u9A8C\u7684\u5206\u4EAB\u8D26\u53F7\u5B57\u6BB5", "\u5B57\u6BB5\u540D\u6307\u5411\u5206\u4EAB\u8D26\u53F7\uFF1B\u53C2\u6570\u53EF\u4FEE\u6539\uFF0C\u4E5F\u53EF\u80FD\u4FDD\u7559\u66F4\u65E9\u7684\u5206\u4EAB\u6765\u6E90\uFF0C\u4E0D\u80FD\u8BC1\u660E\u5F53\u524D\u53D1\u9001\u4EBA\u8EAB\u4EFD\u3002"];
    if (account.has(key)) return ["account", "\u5F52\u5C5E\u4E0D\u660E\u7684\u8D26\u53F7\u5B57\u6BB5", "\u94FE\u63A5\u5185\u51FA\u73B0\u8D26\u53F7\u6807\u8BC6\uFF0C\u4F46\u65E0\u6CD5\u786E\u8BA4\u5C5E\u4E8E\u5206\u4EAB\u4EBA\u8FD8\u662F\u5185\u5BB9\u4F5C\u8005\u3002"];
    if (author.has(key)) return ["author", "\u5185\u5BB9\u4F5C\u8005\u5B57\u6BB5", "\u8FD9\u662F\u94FE\u63A5\u58F0\u79F0\u7684\u5185\u5BB9\u4F5C\u8005\uFF0C\u4E0D\u4EE3\u8868\u5206\u4EAB\u4EBA\u3002"];
    if (device.has(key)) return ["device", "\u8BBE\u5907 / \u5B89\u88C5\u5B57\u6BB5", "\u4E0D\u4F5C\u4E3A\u8D26\u53F7\u89E3\u6790\uFF1B\u4E0D\u80FD\u56E0\u4E3A\u503C\u7684\u683C\u5F0F\u76F8\u4F3C\u5C31\u5F53\u4F5C\u7528\u6237 sec_uid\u3002"];
    if (tracking.has(key)) return ["tracking", "\u5206\u4EAB\u7EBF\u7D22", "\u4FDD\u7559\u539F\u503C\u4F9B\u6838\u5BF9\uFF1B\u672C\u5DE5\u5177\u6CA1\u6709\u8BE5\u5B57\u6BB5\u5230\u8D26\u53F7\u7684\u53EF\u9760\u516C\u5F00\u6620\u5C04\u3002"];
    return ["other", "\u5176\u4ED6\u53C2\u6570", "\u4EC5\u5C55\u793A\u539F\u59CB\u53C2\u6570\uFF0C\u4E0D\u63A8\u65AD\u8EAB\u4EFD\u3002"];
  }
  function profileFor(key, value) {
    if (["share_sec_uid", "share_sec_user_id", "sec_uid", "sec_user_id", "author_sec_uid", "profile"].includes(key) && /^MS4wLjAB[A-Za-z0-9_-]{8,240}$/.test(value)) {
      return "https://www.douyin.com/user/" + encodeURIComponent(value);
    }
    return null;
  }
  function parseShareActivity(raw) {
    let value = raw;
    for (let attempt = 0; attempt < 3 && typeof value === "string"; attempt++) {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
      } catch {
        try {
          const next = decodeURIComponent(value);
          if (next === value) break;
          value = next;
        } catch {
          break;
        }
      }
    }
    return null;
  }
  function numericUid(value) {
    if (typeof value === "number" && !Number.isSafeInteger(value)) return null;
    if (!["string", "number"].includes(typeof value)) return null;
    const uid = String(value);
    return /^[1-9]\d{4,24}$/.test(uid) ? uid : null;
  }
  function activityEvidence(raw, source) {
    const activity = parseShareActivity(raw);
    if (!activity) return [];
    const evidence = [];
    const add = (key, value, kind, label, note) => evidence.push({ key: "activity_info." + key, value, kind, label, note, source, profile: null });
    const uid = numericUid(activity.social_share_user_id);
    if (uid) add("social_share_user_id", uid, "sharer", "\u5206\u4EAB\u4EBA UID", "\u4ECE\u5206\u4EAB\u6D3B\u52A8\u5B57\u6BB5\u76F4\u63A5\u8BFB\u53D6\u7684\u8D26\u53F7 UID\uFF1B\u518D\u6B21\u8F6C\u53D1\u53EF\u80FD\u4FDD\u7559\u539F\u5206\u4EAB\u4EBA\uFF0C\u4E0D\u8BC1\u660E\u5F53\u524D\u53D1\u9001\u4EBA\u7684\u8EAB\u4EFD\u3002");
    const authorId = numericUid(activity.social_author_id);
    if (authorId) add("social_author_id", authorId, "author", "\u5206\u4EAB\u65F6\u5F15\u7528\u7684\u4F5C\u8005 UID", "\u4F5C\u8005\u5B57\u6BB5\u72EC\u7ACB\u5C55\u793A\uFF0C\u4E0D\u7528\u5B83\u4EE3\u66FF\u5206\u4EAB\u4EBA UID\u3002");
    if (typeof activity.social_share_time === "string" && /^\d{9,13}$/.test(activity.social_share_time)) add("social_share_time", activity.social_share_time, "tracking", "\u5206\u4EAB\u65F6\u95F4\u6233", "\u6765\u81EA\u5206\u4EAB\u6D3B\u52A8\u53C2\u6570\u7684\u539F\u59CB\u65F6\u95F4\u6233\uFF0C\u4E0D\u7528\u4E8E\u5224\u65AD\u8D26\u53F7\u3002");
    return evidence;
  }
  function analyzeShareUrls(values) {
    if (!Array.isArray(values) || !values.length || values.length > 8) throw new Error("\u8DF3\u8F6C\u94FE\u683C\u5F0F\u4E0D\u6B63\u786E\u3002");
    const urls = values.map((value) => validateDouyinUrl(value).href);
    const fields = [];
    const videos = /* @__PURE__ */ new Set();
    urls.forEach((value, index) => {
      const url = new URL(value);
      const video = url.pathname.match(/^\/(?:share\/)?(?:video|note)\/(\d+)\/?$/)?.[1] || url.searchParams.get("modal_id");
      if (/^\d{10,25}$/.test(video || "")) videos.add(video);
      const profile = url.pathname.match(/^\/(?:share\/)?user\/([^/]+)\/?$/)?.[1];
      if (profile) fields.push({ key: "profile", value: decodeSafe(profile), kind: "profile", label: "\u4E3B\u9875\u6240\u5C5E\u8D26\u53F7", note: "\u8FD9\u662F\u88AB\u5206\u4EAB\u4E3B\u9875\u7684\u8D26\u53F7\uFF0C\u4E0D\u80FD\u636E\u6B64\u8BA4\u5B9A\u662F\u5206\u4EAB\u4EBA\u3002", source: index + 1, profile: profileFor("profile", decodeSafe(profile)) });
      for (const [key, val] of url.searchParams) {
        const [kind, label, note] = describe(key);
        fields.push({ key, value: val, kind, label, note, source: index + 1, profile: profileFor(key, val) });
        if (key === "activity_info") fields.push(...activityEvidence(val, index + 1));
      }
    });
    const candidates = fields.filter((field) => field.kind === "candidate" && /^(?:\d{5,25}|MS4wLjAB[A-Za-z0-9_-]{8,240})$/.test(field.value));
    const sharers = [...new Set(fields.filter((field) => field.kind === "sharer").map((field) => field.value))];
    const clues = fields.filter((field) => field.kind === "tracking");
    const short = new URL(urls.at(-1)).hostname === "v.douyin.com";
    const state = sharers.length > 1 ? "conflict" : sharers.length ? "identified" : candidates.length ? "candidate" : clues.length ? "clues" : short ? "short" : "unavailable";
    return { urls, fields, candidates, sharers, videos: [...videos], state, confirmed: false };
  }
  function decodeSafe(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  // tools/media/scripts/share-account.mjs
  var $ = (id) => document.getElementById(id);
  var generation = 0;
  var activeRequest;
  var report = "";
  var verdicts = {
    identified: ["\u5DF2\u89E3\u6790\u5206\u4EAB\u4EBA UID", "\u627E\u5230\u94FE\u63A5\u4E2D\u7684\u5206\u4EAB\u4EBA\u8D26\u53F7", "\u8D26\u53F7\u6765\u81EA activity_info.social_share_user_id\u3002\u516C\u5F00\u4E3B\u9875\u4F1A\u6309\u8FD9\u4E2A UID \u67E5\u8BE2\uFF1B\u518D\u6B21\u8F6C\u53D1\u53EF\u80FD\u4FDD\u7559\u539F\u5206\u4EAB\u4EBA\u3002"],
    conflict: ["\u5206\u4EAB\u4EBA\u5B57\u6BB5\u51B2\u7A81", "\u53D1\u73B0\u591A\u4E2A\u4E0D\u540C\u7684\u5206\u4EAB\u4EBA UID", "\u8FD9\u4E9B\u94FE\u63A5\u6216\u91CD\u590D\u53C2\u6570\u643A\u5E26\u4E0D\u540C\u8D26\u53F7\uFF0C\u6682\u4E0D\u81EA\u52A8\u9009\u62E9\u6216\u67E5\u8BE2\u4E3B\u9875\uFF0C\u8BF7\u6838\u5BF9\u5B57\u6BB5\u6765\u6E90\u3002"],
    candidate: ["\u53D1\u73B0\u5019\u9009\u8D26\u53F7", "\u627E\u5230\u5F85\u6838\u9A8C\u7684\u5206\u4EAB\u8D26\u53F7\u5B57\u6BB5", "\u4E0B\u9762\u7684\u503C\u6765\u81EA\u94FE\u63A5\u53C2\u6570\uFF0C\u5C1A\u672A\u7ECF\u8FC7\u5E73\u53F0\u8EAB\u4EFD\u6838\u9A8C\uFF0C\u4E0D\u80FD\u8BC1\u660E\u5F53\u524D\u53D1\u9001\u4EBA\u7684\u8EAB\u4EFD\u3002"],
    clues: ["\u53D1\u73B0\u5206\u4EAB\u7EBF\u7D22", "\u6682\u65E0\u6CD5\u786E\u8BA4\u5206\u4EAB\u4EBA\u8D26\u53F7", "\u94FE\u63A5\u4FDD\u7559\u4E86\u5206\u4EAB\u8FFD\u8E2A\u5B57\u6BB5\uFF0C\u4F46\u8FD9\u4E9B\u5B57\u6BB5\u6CA1\u6709\u53EF\u4F9B\u672C\u5DE5\u5177\u53EF\u9760\u8FD8\u539F\u8D26\u53F7\u7684\u6620\u5C04\u3002"],
    short: ["\u9700\u8981\u5C55\u5F00\u77ED\u94FE\u63A5", "\u77ED\u7801\u672C\u8EAB\u65E0\u6CD5\u8BC6\u522B\u8D26\u53F7", "\u53EF\u5173\u95ED\u201C\u4EC5\u672C\u5730\u5206\u6790\u201D\u540E\u91CD\u8BD5\uFF0C\u6216\u8865\u5145\u8DF3\u8F6C\u540E\u7684\u6296\u97F3\u957F\u94FE\u63A5\u3002"],
    unavailable: ["\u672A\u53D1\u73B0\u5206\u4EAB\u4EBA\u5B57\u6BB5", "\u65E0\u6CD5\u4ECE\u6B64\u94FE\u63A5\u786E\u8BA4\u5206\u4EAB\u4EBA", "\u94FE\u63A5\u53EF\u80FD\u53EA\u5305\u542B\u89C6\u9891\u6216\u4E3B\u9875\u4FE1\u606F\u3002\u5185\u5BB9\u4F5C\u8005\u3001\u88AB\u5206\u4EAB\u7684\u4E3B\u9875\u8D26\u53F7\u90FD\u4E0D\u7B49\u4E8E\u5206\u4EAB\u4EBA\u3002"]
  };
  if (location.protocol === "file:") {
    $("file-help").hidden = false;
    $("local-only").checked = true;
    $("local-only").disabled = true;
  }
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== void 0) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function link(text, href) {
    const node = element("a", text);
    node.href = href;
    node.target = "_blank";
    node.rel = "noopener noreferrer";
    return node;
  }
  function status(text, error = false) {
    $("status").textContent = text;
    $("status").dataset.error = String(error);
  }
  function invalidate() {
    generation++;
    activeRequest?.abort();
    activeRequest = null;
    $("analyze").disabled = false;
    $("analyze").textContent = "\u8BC6\u522B\u8D26\u53F7\u7EBF\u7D22 \u2197";
    $("result").hidden = true;
    report = "";
    for (const id of ["account-list", "fields", "chain", "video-line", "result-tag", "result-heading", "result-description", "field-count", "hop-count"]) $(id).replaceChildren();
  }
  for (const id of ["share-input", "expanded-input", "local-only"]) $(id).addEventListener(id === "local-only" ? "change" : "input", () => {
    invalidate();
    status("\u8F93\u5165\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u91CD\u65B0\u8BC6\u522B\u3002");
  });
  function render(result, chain, notice, profile = null) {
    const [tag, heading, description] = verdicts[result.state];
    $("result-tag").textContent = tag;
    $("result-heading").textContent = heading;
    $("result-description").textContent = description;
    $("verdict").dataset.state = result.state;
    $("account-list").replaceChildren();
    $("fields").replaceChildren();
    $("chain").replaceChildren();
    $("video-line").replaceChildren();
    for (const uid of result.sharers) {
      const box = element("div", void 0, "sharer-account");
      const matched = result.state === "identified" && profile?.uid === uid && profileFor("sec_uid", profile.secUid);
      box.append(element("strong", "\u5206\u4EAB\u4EBA UID"), element("p", uid, "account-uid"));
      if (matched) {
        if (profile.nickname) box.append(element("p", "\u6635\u79F0\uFF1A" + profile.nickname));
        if (profile.handle) box.append(element("p", "\u6296\u97F3\u53F7\uFF1A" + profile.handle));
        box.append(link("\u6253\u5F00\u5206\u4EAB\u4EBA\u516C\u5F00\u4E3B\u9875 \u2197", matched));
        box.append(element("p", "\u516C\u5F00\u63A5\u53E3\u8FD4\u56DE\u7684 UID \u4E0E\u94FE\u63A5\u4E2D\u5206\u4EAB\u4EBA UID \u4E00\u81F4\u3002", "help"));
      } else box.append(element("p", result.state === "conflict" ? "\u5B58\u5728\u51B2\u7A81\uFF0C\u672A\u67E5\u8BE2\u4E3B\u9875\u3002" : "UID \u5DF2\u89E3\u6790\uFF1B\u516C\u5F00\u4E3B\u9875\u5C1A\u672A\u53D6\u5F97\u3002", "help"));
      $("account-list").append(box);
    }
    for (const candidate of result.candidates) {
      const box = element("div", void 0, "candidate");
      box.append(element("strong", candidate.key), element("p", candidate.value), element("p", "\u5019\u9009\u503C \xB7 \u672A\u6838\u9A8C\uFF0C\u53EF\u80FD\u5C5E\u4E8E\u66F4\u65E9\u7684\u5206\u4EAB\u6765\u6E90"));
      if (candidate.profile) box.append(link("\u6253\u5F00\u5019\u9009\u4E3B\u9875\u6838\u5BF9 \u2197", candidate.profile));
      $("account-list").append(box);
    }
    for (const id of result.videos) {
      const row = element("p");
      row.append(element("span", "\u4F5C\u54C1 ID\uFF1A" + id + " \xB7 "), link("\u67E5\u770B\u4F5C\u54C1 \u2197", "https://www.douyin.com/video/" + id));
      $("video-line").append(row);
    }
    if (!result.fields.length) $("fields").append(element("p", "\u6CA1\u6709\u53D1\u73B0\u53EF\u89E3\u6790\u7684\u67E5\u8BE2\u53C2\u6570\u3002", "help"));
    const order = ["sharer", "candidate", "account", "profile", "author", "tracking", "device", "other"];
    for (const field of [...result.fields].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))) {
      const row = element("div", void 0, "field");
      const head = element("div", void 0, "field-head");
      head.append(element("code", field.key), element("span", field.label + " \xB7 \u94FE\u63A5 " + field.source));
      row.append(head, element("div", field.value || "\uFF08\u7A7A\u503C\uFF09", "field-value"), element("p", field.note));
      if (field.profile) row.append(link("\u6253\u5F00\u8BE5\u5B57\u6BB5\u6307\u5411\u7684\u4E3B\u9875 \u2197", field.profile));
      $("fields").append(row);
    }
    chain.forEach((hop, index) => {
      const row = element("li");
      row.append(element("code", `${hop.manual ? "\u624B\u52A8\u8865\u5145 \xB7 \u5173\u8054\u672A\u9A8C\u8BC1" : "\u94FE\u63A5 " + (index + 1)}${hop.status ? " \xB7 HTTP " + hop.status : ""}`), link(hop.url, hop.url));
      $("chain").append(row);
    });
    $("field-count").textContent = result.fields.length + " \u9879";
    $("hop-count").textContent = chain.length + " \u6761";
    $("result").hidden = false;
    $("verdict").focus({ preventScroll: true });
    $("result").scrollIntoView({ block: "start" });
    status(notice);
    report = ["\u5206\u4EAB\u94FE\u63A5\u8D26\u53F7\u8BC6\u522B", heading, description, "\u94FE\u63A5\u4E2D\u7684\u5206\u4EAB\u4EBA UID\uFF1A" + (result.sharers.join("\u3001") || "\u672A\u53D6\u5F97"), "\u4EE5\u4E0A\u8D26\u53F7\u4E0D\u8BC1\u660E\u5F53\u524D\u53D1\u9001\u4EBA\u7684\u8EAB\u4EFD\u3002", ...profile ? ["\u516C\u5F00\u4E3B\u9875\uFF1A" + profileFor("sec_uid", profile.secUid), "\u6635\u79F0\uFF1A" + profile.nickname, "\u6296\u97F3\u53F7\uFF1A" + profile.handle] : [], notice, "", ...result.fields.map((f) => `[\u94FE\u63A5 ${f.source}] ${f.key} = ${f.value}
${f.label}\uFF1A${f.note}`), "", "\u8DF3\u8F6C\u94FE\uFF08\u624B\u52A8\u8865\u5145\u7684\u94FE\u63A5\u5173\u8054\u672A\u9A8C\u8BC1\uFF09\uFF1A", ...chain.map((h) => `${h.manual ? "[\u624B\u52A8\u8865\u5145] " : ""}${h.url}`)].join("\n");
  }
  async function apiPost(payload) {
    const response = await fetch("/tools/media/share-account/api/resolve", { method: "POST", credentials: "omit", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.any([activeRequest.signal, AbortSignal.timeout(2e4)]) });
    if (!(response.headers.get("content-type") || "").includes("application/json")) throw new Error("\u672C\u7AD9\u672A\u8FDE\u63A5\u8D26\u53F7\u89E3\u6790\u670D\u52A1\u3002");
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || "\u89E3\u6790\u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528\u3002");
    return body;
  }
  $("analyze").addEventListener("click", async () => {
    invalidate();
    const run = generation;
    try {
      const initial = extractShareUrl($("share-input").value);
      const expanded = $("expanded-input").value.trim() ? extractShareUrl($("expanded-input").value) : null;
      activeRequest = new AbortController();
      let chain = [{ url: initial, status: null }];
      let notice = "\u5DF2\u5B8C\u6210\u672C\u5730\u5206\u6790\uFF0C\u672A\u8BF7\u6C42\u6296\u97F3\u9875\u9762\u3002";
      if (new URL(initial).hostname === "v.douyin.com" && !$("local-only").checked) {
        $("analyze").disabled = true;
        $("analyze").textContent = "\u6B63\u5728\u5C55\u5F00\u2026";
        status("\u6B63\u5728\u5C55\u5F00\u77ED\u94FE\u63A5\uFF0C\u4FDD\u7559\u5404\u7EA7\u8DF3\u8F6C\u53C2\u6570\u2026");
        try {
          const body = await apiPost({ input: initial });
          if (!Array.isArray(body.chain) || !body.chain.length || body.chain.length > 7) throw new Error("\u89E3\u6790\u670D\u52A1\u672A\u8FD4\u56DE\u6709\u6548\u8DF3\u8F6C\u94FE\u3002");
          analyzeShareUrls(body.chain.map((hop) => hop.url));
          chain = body.chain;
          notice = body.message || "\u5DF2\u4FDD\u7559\u8DF3\u8F6C\u94FE\u3002";
        } catch (error) {
          if (run !== generation) return;
          notice = (error.name === "TimeoutError" ? "\u5C55\u5F00\u77ED\u94FE\u63A5\u8D85\u65F6\u3002" : error.message || "\u77ED\u94FE\u63A5\u89E3\u6790\u5931\u8D25\u3002") + " \u5DF2\u4FDD\u7559\u672C\u5730\u7ED3\u679C\uFF1B\u53EF\u8865\u5145\u8DF3\u8F6C\u540E\u7684\u957F\u94FE\u63A5\u3002";
        }
      }
      if (run !== generation) return;
      if (expanded && !chain.some((h) => h.url === expanded)) {
        chain.push({ url: expanded, status: null, manual: true });
        notice += " \u5305\u542B\u624B\u52A8\u8865\u5145\u5730\u5740\uFF0C\u5176\u4E0E\u539F\u94FE\u63A5\u7684\u5173\u7CFB\u672A\u9A8C\u8BC1\u3002";
      }
      const analysis = analyzeShareUrls(chain.map((hop) => hop.url));
      let profile = null;
      if (analysis.state === "identified" && !$("local-only").checked) {
        $("analyze").disabled = true;
        $("analyze").textContent = "\u6B63\u5728\u67E5\u8BE2\u4E3B\u9875\u2026";
        status("\u5DF2\u89E3\u6790\u5206\u4EAB\u4EBA UID\uFF0C\u6B63\u5728\u5339\u914D\u516C\u5F00\u4E3B\u9875\u2026");
        try {
          const body = await apiPost({ operation: "profile", uid: analysis.sharers[0] });
          if (body.profile?.uid !== analysis.sharers[0] || !profileFor("sec_uid", body.profile?.secUid)) throw new Error("\u516C\u5F00\u4E3B\u9875\u672A\u5339\u914D\u5230\u76F8\u540C UID\u3002");
          profile = body.profile;
          notice += " \u5DF2\u6309\u5206\u4EAB\u4EBA UID \u53D6\u5F97\u516C\u5F00\u4E3B\u9875\u3002";
        } catch (error) {
          if (run !== generation) return;
          notice += " " + (error.name === "TimeoutError" ? "\u516C\u5F00\u4E3B\u9875\u67E5\u8BE2\u8D85\u65F6\u3002" : error.message || "\u516C\u5F00\u4E3B\u9875\u6682\u65F6\u4E0D\u53EF\u7528\u3002") + " \u5DF2\u4FDD\u7559\u5206\u4EAB\u4EBA UID\u3002";
        }
      }
      if (run !== generation) return;
      render(analysis, chain, notice, profile);
    } catch (error) {
      if (run === generation) status(error.message, true);
    } finally {
      if (run === generation) {
        $("analyze").disabled = false;
        $("analyze").textContent = "\u8BC6\u522B\u8D26\u53F7\u7EBF\u7D22 \u2197";
        activeRequest = null;
      }
    }
  });
  $("clear").addEventListener("click", () => {
    invalidate();
    $("share-input").value = "";
    $("expanded-input").value = "";
    status("\u5DF2\u6E05\u7A7A\u8F93\u5165\u548C\u7ED3\u679C\u3002");
    $("share-input").focus();
  });
  $("sample").addEventListener("click", () => {
    invalidate();
    const sample = new URL("https://www.iesdouyin.com/share/video/7000000000000000000/");
    sample.searchParams.set("activity_info", JSON.stringify({ social_share_user_id: "10000000001", social_author_id: "20000000002", social_share_time: "1792944000" }));
    sample.searchParams.set("u_code", "demo_share_code");
    sample.searchParams.set("did", "demo_device");
    $("share-input").value = "\u6F14\u793A\u6570\u636E\uFF08\u975E\u771F\u5B9E\u8D26\u53F7\uFF09\uFF1A" + sample.href;
    $("local-only").checked = true;
    $("expanded-input").value = "";
    status("\u5DF2\u8F7D\u5165\u865A\u6784\u793A\u4F8B\uFF0C\u5E76\u5F00\u542F\u4EC5\u672C\u5730\u5206\u6790\uFF0C\u4E0D\u4F1A\u67E5\u8BE2\u793A\u4F8B\u8D26\u53F7\u3002\u70B9\u51FB\u8BC6\u522B\uFF0C\u67E5\u770B\u5206\u4EAB\u4EBA UID \u4E0E\u4F5C\u8005\u7684\u533A\u522B\u3002");
    $("share-input").focus();
  });
  $("copy-report").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(report);
      status("\u62A5\u544A\u5DF2\u590D\u5236\uFF0C\u5305\u542B\u94FE\u63A5\u539F\u59CB\u53C2\u6570\u3002");
    } catch {
      status("\u6D4F\u89C8\u5668\u672A\u5141\u8BB8\u590D\u5236\uFF0C\u8BF7\u624B\u52A8\u9009\u62E9\u7ED3\u679C\u6587\u5B57\u590D\u5236\u3002", true);
    }
  });
})();
