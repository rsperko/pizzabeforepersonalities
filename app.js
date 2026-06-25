(function () {
  var cfg = window.PBP_CONFIG || {};
  var source = cfg.sheetCsvUrl && cfg.sheetCsvUrl.trim() ? cfg.sheetCsvUrl : cfg.localCsvUrl;
  var loadedSource = source;

  function parseCsv(text) {
    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else { field += c; }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field); field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else {
        field += c;
      }
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function toRecords(rows) {
    if (!rows.length) return [];
    var header = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    var idx = {
      date: header.indexOf("date"),
      pizza: header.indexOf("pizza"),
      pizzaTime: header.indexOf("pizza time"),
      meeting: header.indexOf("meeting"),
      meetingTime: header.indexOf("meeting time"),
      acic: header.indexOf("acic"),
      announcement: header.indexOf("announcement")
    };
    function cell(r, i) { return i >= 0 ? (r[i] || "").trim() : ""; }
    return rows.slice(1).map(function (r) {
      return {
        date: cell(r, idx.date),
        pizza: cell(r, idx.pizza),
        pizzaTime: cell(r, idx.pizzaTime),
        meeting: cell(r, idx.meeting),
        meetingTime: cell(r, idx.meetingTime),
        acic: cell(r, idx.acic),
        announcement: cell(r, idx.announcement)
      };
    }).filter(function (e) { return e.date; });
  }

  function parseDate(mdy) {
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(mdy.trim());
    if (!m) return null;
    var month = parseInt(m[1], 10) - 1;
    var day = parseInt(m[2], 10);
    var year = parseInt(m[3], 10);
    if (year < 100) year += year < 70 ? 2000 : 1900;
    return new Date(year, month, day);
  }

  function fmtLong(d) {
    return d.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function pickCurrent(events) {
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var dated = events.map(function (e) { return { e: e, d: parseDate(e.date) }; })
      .filter(function (x) { return x.d; });
    var upcoming = dated.filter(function (x) { return x.d >= now; })
      .sort(function (a, b) { return a.d - b.d; });
    if (upcoming.length) return upcoming[0];
    return dated.sort(function (a, b) { return b.d - a.d; })[0] || null;
  }

  function renderCurrent(pick) {
    var el = document.getElementById("current");
    if (!pick) { el.innerHTML = '<p class="error">No event found.</p>'; return; }
    var e = pick.e;
    var isUpcoming = pick.d >= new Date(new Date().setHours(0, 0, 0, 0));
    var banner = e.announcement
      ? '<p class="announcement" role="alert"><span class="announcement-tag">Heads up</span>' +
          esc(e.announcement) + '</p>'
      : '';
    el.innerHTML =
      banner +
      '<p class="when"><small>' + (isUpcoming ? "Next Gathering" : "Most Recent") + '</small>' +
      esc(fmtLong(pick.d)) + '</p>' +
      '<div class="detail-grid">' +
        '<div class="detail"><p class="label">Pizza</p>' +
          '<p class="value">' + esc(e.pizza) + '</p>' +
          '<p class="time">' + esc(e.pizzaTime || cfg.pizzaTime || "") + '</p></div>' +
        '<div class="detail"><p class="label">Meeting</p>' +
          '<p class="value">' + esc(e.meeting) + '</p>' +
          '<p class="time">' + esc(e.meetingTime || cfg.meetingTime || "") + '</p></div>' +
      '</div>' +
      '<p class="acic-line">ACIC: <strong>' + esc(e.acic) + '</strong></p>';
  }

  function renderArchive(events) {
    var body = document.getElementById("archive-body");
    var sorted = events.slice().sort(function (a, b) {
      var da = parseDate(a.date), db = parseDate(b.date);
      if (!da || !db) return 0;
      return db - da;
    });
    body.innerHTML = sorted.map(function (e) {
      return '<tr>' +
        '<td>' + esc(e.date) + '</td>' +
        '<td>' + esc(e.pizza) + '</td>' +
        '<td>' + esc(e.meeting) + '</td>' +
        '<td>' + esc(e.acic) + '</td>' +
      '</tr>';
    }).join("");
    wireFilter(sorted.length);
  }

  function wireFilter(total) {
    var input = document.getElementById("filter");
    var count = document.getElementById("count");
    var rows = Array.prototype.slice.call(document.querySelectorAll("#archive-body tr"));
    function apply() {
      var q = input.value.trim().toLowerCase();
      var shown = 0;
      rows.forEach(function (tr) {
        var match = !q || tr.textContent.toLowerCase().indexOf(q) !== -1;
        tr.style.display = match ? "" : "none";
        if (match) shown++;
      });
      count.textContent = q
        ? shown + " of " + total + " events"
        : total + " events since 2005";
    }
    input.addEventListener("input", apply);
    apply();
  }

  function fail(msg) {
    document.getElementById("current").innerHTML = '<p class="error">' + esc(msg) + '</p>';
  }

  function loadCsv(url) {
    return fetch(url, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        loadedSource = url;
        return r.text();
      });
  }

  loadCsv(source)
    .catch(function (err) {
      if (source !== cfg.localCsvUrl) return loadCsv(cfg.localCsvUrl);
      throw err;
    })
    .then(function (r) {
      var text = r;
      var events = toRecords(parseCsv(text));
      if (!events.length) throw new Error("No rows in data source.");
      renderCurrent(pickCurrent(events));
      renderArchive(events);
      var note = document.getElementById("footer-note");
      note.textContent = loadedSource === cfg.sheetCsvUrl
        ? "Updated live from Google Sheets."
        : "Showing bundled archive data.";
    })
    .catch(function (err) {
      fail("Could not load the schedule (" + err.message + ").");
      var note = document.getElementById("footer-note");
      if (note) note.textContent = "";
    });
})();
