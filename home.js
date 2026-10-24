(() => {
  const progress=globalThis.DinoAchievements.state;
  document.getElementById('home-best').textContent=`PERSONAL BEST ${String(Math.floor(progress.best.score||0)).padStart(5,'0')}`;
  document.getElementById('home-achievements').textContent=`${Object.keys(progress.unlocked).length} / ${globalThis.DinoAchievementData.items.length} ACHIEVEMENTS`;
})();
