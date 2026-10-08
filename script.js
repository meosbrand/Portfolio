(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('year').textContent = new Date().getFullYear();

  // Mobile menu
  var nav = document.getElementById('nav'), menu = document.getElementById('menu');
  menu.addEventListener('click', function(){ var o = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', o); });
  nav.querySelectorAll('.links a').forEach(function(a){ a.addEventListener('click', function(){ nav.classList.remove('open'); menu.setAttribute('aria-expanded', false); }); });

  // Rotating role, colored by domain
  var roles = [["offensive security","#F5A524"],["defensive security","#2DD4BF"],["GRC and compliance","#8B9CFF"],["AI automation","#E8ECF3"]];
  var el = document.getElementById('typed');
  if (reduce) { el.textContent = "offense, defense, GRC and AI"; }
  else {
    var i = 0, n = roles[0][0].length, del = false;
    el.style.color = roles[0][1];
    (function tick(){
      var word = roles[i][0];
      if (!del) { n++; if (n > word.length) { del = true; return setTimeout(tick, 1700); } }
      else { n--; if (n === 0) { del = false; i = (i + 1) % roles.length; el.style.color = roles[i][1]; return setTimeout(tick, 280); } }
      el.textContent = roles[i][0].slice(0, n);
      setTimeout(tick, del ? 34 : 62);
    })();
  }

  // Terminal session, typed once on load
  var lines = [
    ['p','meo@lab:~$ ','c','whoami'],
    ['','Michael "Meo" Ajekigbe, AI and security consultant'],
    ['p','meo@lab:~$ ','c','cat scope.txt'],
    ['k-off','offense  ','','web, API and network pentests'],
    ['k-def','defense  ','','SIEM triage, detection rules, hardening'],
    ['k-grc','grc      ','','policies, risk, ISO 27001 and NDPR'],
    ['k-ai','ai       ','','automations, agents, safe adoption'],
    ['p','meo@lab:~$ ','c','./work-with-me --for small-business'],
    ['ok','ready    ','','yungbayo01@gmail.com']
  ];
  var term = document.getElementById('term');
  function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  function render(upto){
    var out = '', left = upto;
    for (var l = 0; l < lines.length && left > 0; l++){
      var segs = lines[l];
      for (var s = 0; s < segs.length; s += 2){
        var txt = segs[s+1], take = Math.min(txt.length, left); left -= take;
        out += segs[s] ? '<span class="'+segs[s]+'">'+esc(txt.slice(0,take))+'</span>' : esc(txt.slice(0,take));
        if (left <= 0) break;
      }
      if (left > 0) out += '\n';
    }
    term.innerHTML = out + (upto < total ? '<span class="caret" style="color:#2DD4BF"></span>' : '');
  }
  var total = lines.reduce(function(a,seg){ for (var s = 1; s < seg.length; s += 2) a += seg[s].length; return a; }, 0);
  if (reduce) { render(total); }
  else {
    var c = 0;
    setTimeout(function step(){ c += 2; render(c); if (c < total) setTimeout(step, 18); }, 650);
  }
})();
