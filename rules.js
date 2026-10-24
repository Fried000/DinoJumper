(() => {
  function reveal(hash){if(!hash)return;const chapter=document.getElementById(hash.slice(1));if(chapter instanceof HTMLDetailsElement)chapter.open=true;}
  document.querySelectorAll('.guide-nav a').forEach(link=>link.addEventListener('click',()=>reveal(link.hash)));
  addEventListener('hashchange',()=>reveal(location.hash));reveal(location.hash);
})();
