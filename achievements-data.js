(() => {
  'use strict';
  const branches=[
    ['journey','The Long Road','foot','Distance, movement, and stubborn persistence.'],
    ['combat','Monster Hunter','sword','Five visitors. Several ways to outsmart them.'],
    ['exploration','Into the Unknown','map','Detours, weather, and uncharted horizons.'],
    ['collection','Fossil Record','bone','A museum built one dangerous pickup at a time.'],
    ['survival','Against All Odds','egg','Second chances and improbable comebacks.'],
    ['builds','Strange Science','crystal','Experiment with builds, then attempt the impossible.'],
  ].map(([id,name,icon,description])=>({id,name,icon,description}));
  // Criteria refer only to observed statistics, not to clicking around the map.
  const definitions=[
    ['first-steps','journey','First Footprints','Every expedition starts somewhere.','Begin your first run.','foot',[['stats.runs',1]],[]],
    ['hopscotch','journey','Hopscotch Archaeology','The ground is overrated.','Jump 25 times across your runs.','boot',[['stats.jumps',25]],['first-steps']],
    ['air-mail','journey','Air Mail','A second stamp on gravity’s passport.','Perform 25 double jumps.','wing',[['stats.doubleJumps',25]],['hopscotch']],
    ['terminal','journey','Terminal Velocity','The horizon has started running away.','Reach the maximum running speed of 920.','bolt',[['best.speed',920]],['first-steps']],
    ['four-figures','journey','Four Figures','The desert was only the introduction.','Reach 1,000 points in one run.','flag',[['best.score',1000]],['first-steps']],
    ['five-k','journey','Five Thousand Reasons','You could have stopped a while ago.','Reach 5,000 points in one run.','star',[['best.score',5000]],['four-figures']],
    ['long-haul','journey','The Long Haul','Bring snacks next time.','Reach 10,000 points in one run.','map',[['best.score',10000]],['five-k']],
    ['further','journey','A Lot Further','The title was an understatement.','Reach 25,000 points and perform 100 double jumps across runs.','trophy',[['best.score',25000],['stats.doubleJumps',100]],['long-haul','terminal']],
    ['bird','combat','Return to Sender','Your flight has been cancelled.','Defeat the ball-spitting bird.','wing',[['stats.boss1',1]],[]],
    ['horns','combat','No Horns Allowed','Right of way is a suggestion.','Defeat the charging triceratops.','shield',[['stats.boss2',1]],['bird']],
    ['rex','combat','Rock, Paper, Dinosaur','Paper would have been easier.','Defeat the boulder T. rex.','crystal',[['stats.boss3',1]],['horns']],
    ['dragon','combat','Fire Exit','Please leave the volcano calmly.','Defeat the volcanic dragon.','flame',[['stats.boss4',1]],['rex']],
    ['shadow','combat','Me, Myself, and Run','The hardest person to outrun is you.','Defeat Shadow Dino and complete the gauntlet.','trophy',[['stats.boss5',1]],['dragon']],
    ['untouched','combat','Untouchable','No shells cracked in this encounter.','Defeat a boss without getting hit, consuming a shield, or reviving during that fight.','star',[['flags.perfectBoss',1]],['bird']],
    ['clean-sweep','combat','Flawless Expedition','Five bosses. Zero excuses.','Win one gauntlet with zero hits and zero revivals.','trophy',[['flags.cleanWin',1]],['shadow','untouched']],
    ['purist','combat','Bare Bones','Leave the magical rectangles alone.','Win a gauntlet without collecting shield/clock pickups, building a shell shield, or using Boss Shield.','bone',[['flags.noPowerWin',1]],['shadow']],
    ['wanderer','exploration','Wrong Turn, Right World','Getting lost is a valid strategy.','Discover 3 different biomes across runs.','map',[['stats.biomes',3]],[]],
    ['cartographer','exploration','Pocket Cartographer','Your map no longer fits in your pocket.','Discover 10 different biomes.','map',[['stats.biomes',10]],['wanderer']],
    ['naturalist','exploration','The Entire Atlas','There are no blank pages left.','Visit all 48 original named biomes across runs.','trophy',[['stats.namedBiomes',48]],['cartographer']],
    ['frontier','exploration','Here Be Dinosaurs','Beyond the hand-drawn edge of the map.','Enter a generated frontier biome after the first 48.','flag',[['flags.frontier',1]],['naturalist']],
    ['high-road','exploration','Taking the High Road','A respectable kind of trouble.','Land on an optional upper route.','boot',[['stats.routes',1]],['wanderer']],
    ['skyline','exploration','Skyline Collector','You packed a ladder, right?','Visit 3 upper routes and collect 10 upper-route fossils in one run.','wing',[['best.routes',3],['flags.skyline',1]],['high-road']],
    ['weatherproof','exploration','Weather Permitting','Apparently every forecast is wrong.','Survive a complete six-second event of each type: snow, meteors, stampede, and fireflies. Boss-interrupted events do not count.','flame',[['stats.eventTypes',4]],['cartographer']],
    ['world-tour','exploration','Ten Stamps, One Passport','No restarting between destinations.','Visit 10 biomes in a single run, and survive 10 full events across runs.','trophy',[['best.biomes',10],['stats.events',10]],['skyline','weatherproof']],
    ['first-fossil','collection','Old Bone, New Hobby','This belongs in your collection.','Collect your first fossil.','bone',[['stats.fossils',1]],[]],
    ['museum','collection','Museum Curator','The exhibit is getting out of hand.','Collect 100 fossils across runs.','bone',[['stats.fossils',100]],['first-fossil']],
    ['hands-on','collection','Hands-on Archaeology','Magnets are for refrigerators.','Collect 20 fossils in one run before equipping Pickup Magnet.','boot',[['flags.noMagnetRun',1]],['museum']],
    ['fragments','collection','Some Assembly Required','Keep every little piece.','Collect 15 egg fragments across runs.','egg',[['stats.fragments',15]],['first-fossil']],
    ['repair-shop','collection','Shell Service Station','Good as new. More or less.','Build 5 shields from egg fragments.','shield',[['stats.repairs',5]],['fragments']],
    ['rare-find','collection','Museum Quality','Do not lick the priceless fossil.','Collect a fossil worth at least 55 points in a single pickup.','crystal',[['best.fossilValue',55]],['hands-on','repair-shop']],
    ['firefly-thief','collection','Borrowed Starlight','The fireflies will notice eventually.','Collect 10 fossils while firefly-trail events are active.','star',[['stats.fireflyFossils',10]],['museum']],
    ['deep-pockets','collection','Bone Baron','You are now the museum’s biggest problem.','Collect 500 fossils and build 15 shell shields across runs.','trophy',[['stats.fossils',500],['stats.repairs',15]],['rare-find','firefly-thief']],
    ['hatch','survival','Slightly Scrambled','Still a perfectly good dinosaur.','Use a Dino Egg to revive.','egg',[['stats.revives',1]],[]],
    ['last-egg','survival','Out of Shells','The next mistake is the last one.','Use both revivals in one run.','egg',[['flags.usedBoth',1]],['hatch']],
    ['second-wind','survival','Second Wind','A comeback needs some distance.','Gain 2,000 more points after your first revival in the same run.','wing',[['best.afterRevive',2000]],['hatch']],
    ['phoenix','survival','Frequent Hatcher','The eggs recognize you now.','Revive 50 times across runs.','flame',[['stats.revives',50]],['last-egg']],
    ['bubble-wrap','survival','Bubble Wrap Enthusiast','Insurance is a play style.','Let shields absorb 10 hits across runs.','shield',[['stats.shieldSaves',10]],['hatch']],
    ['clutch','survival','Not Today','A very late change of plans.','Revive after 70% of a boss timer has elapsed, then defeat that same boss.','clock',[['flags.clutchBoss',1]],['second-wind']],
    ['comeback','survival','The Third Life','The ending survived two rewrites.','Win the gauntlet after using both revivals in that run.','trophy',[['flags.comebackWin',1]],['last-egg','clutch']],
    ['iron-egg','survival','Unbroken Eggs','Precious cargo, safely delivered.','Win a gauntlet without using a revival. Shields are allowed.','star',[['flags.noReviveWin',1]],['bubble-wrap','second-wind']],
    ['first-build','builds','A Small Advantage','The experiment begins.','Choose an upgrade after a boss pair.','crystal',[['stats.upgrades',1]],[]],
    ['utility-belt','builds','Utility Belt','Prepared for entirely too many situations.','Try Pickup Magnet, Fast Fall, and Safer Revival across different runs.','boot',[['stats.utilityTypes',3]],['first-build']],
    ['catalogue','builds','Peer Reviewed','A practical review of every questionable idea.','Try all 9 upgrade types across runs.','map',[['stats.upgradeTypes',9]],['utility-belt']],
    ['double-down','builds','Double Down','Twice the science, same hypothesis.','Pick the same stackable upgrade at both upgrade events in one run.','crystal',[['flags.doubleDown',1]],['first-build']],
    ['two-tools','builds','Two Tools, One Dino','A balanced approach to bad decisions.','Equip 2 different upgrades in one run.','shield',[['flags.balancedBuild',1]],['first-build']],
    ['landing-gear','builds','Landing Gear','Gravity, now with express shipping.','Clear 5 obstacles within one second of using Fast Fall across runs.','bolt',[['stats.fastFallDodges',5]],['utility-belt']],
    ['warranty','builds','Covered by Warranty','Read the very small print.','Have a Boss Shield absorb a hit in a boss fight.','shield',[['flags.wardSave',1]],['two-tools']],
    ['single-minded','builds','Single-minded','One jump was plenty, apparently.','Win a gauntlet without performing a double jump in that run.','trophy',[['flags.singleJumpWin',1]],['catalogue','double-down','landing-gear','warranty']],
  ];
  const positions=[[80,230],[310,100],[310,360],[550,100],[550,360],[790,230],[1030,100],[1270,230]];
  const items=definitions.map(([id,branch,name,flavor,goal,icon,criteria,parents],index)=>({id,branch,name,flavor,goal,icon,criteria,parents,x:positions[index%8][0],y:positions[index%8][1],points:index%8===7?100:index%8>=5?50:20}));
  const value=(state,path)=>path.split('.').reduce((o,key)=>o?.[key],state)||0;
  const progress=(item,state)=>item.criteria.reduce((sum,[path,target])=>sum+Math.min(1,value(state,path)/target),0)/item.criteria.length;
  globalThis.DinoAchievementData={branches,items,value,progress};
})();
