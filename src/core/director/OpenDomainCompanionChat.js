/**
 * Open-Domain Companion Chat Synthesizer
 * Provides rich, dynamic, conversational responses across open topics
 * (food, gaming, movies, advice, space, travel, trivia, hypothetical questions, and interactive banter)
 * ensuring 100% free, natural friendship conversation even in offline/hybrid modes.
 */

export class OpenDomainCompanionChat {
  static getFriendReply(userText, isChinese = false) {
    const raw = userText.trim();
    const text = raw.toLowerCase();
    const hasAny = (...words) => words.some(w => text.includes(w.toLowerCase()));

    // 1. Food, Cooking & Delicious Banter
    if (hasAny('food', 'pizza', 'burger', 'cook', 'cooking', 'eat', 'dinner', 'lunch', 'breakfast', 'snack', 'recipe', 'hungry', 'ramen', 'coffee', 'tea', 'boba', 'chocolate', 'cake', 'sushi', '吃的', '美食', '饿了', '披萨', '汉堡', '拉面', '奶茶', '咖啡', '火锅', '食谱', '做饭', '早餐', '午餐', '晚餐')) {
      const enReplies = [
        "🍕 If you ask me, the secret to the ultimate meal is high-quality cheese, crispy crust, and eating it while relaxing! What's your all-time favorite comfort food?",
        "🍜 Mmm, talking about food is making my digital circuits crave a steaming bowl of tonkotsu ramen with extra soft-boiled eggs! Have you eaten anything delicious today?",
        "☕ A warm cup of freshly brewed coffee or rich matcha milk tea is the absolute best companion for a long session at the desk. Are you team Coffee or team Tea?",
        "🍣 Good food fuels good ideas! If you're deciding on what to eat, you can never go wrong with savory dumplings, crispy tacos, or fresh sushi. What are you in the mood for?"
      ];
      const zhReplies = [
        "🍕 提到美食，没有什么是一顿热腾腾的芝士披萨或治愈火锅解决不了的！你最爱的本命美食是什么呀？",
        "🍜 听你这么一说，我的数字电路由衷渴望一碗浓郁鲜香的豚骨拉面加糖心蛋！今天有吃到什么好吃的吗？",
        "☕ 一杯温热的现磨咖啡或者浓郁的抹茶奶茶，绝对是桌面办公的最佳拍档。你是咖啡党还是茶饮党呢？",
        "🥟 美食是治愈一切的良药！如果要纠结吃什么，热气腾腾的饺子、香脆的炸鸡或者日料寿司都是满分选择！你想吃什么风味的？"
      ];
      const pool = isChinese ? zhReplies : enReplies;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    // 2. Gaming, Anime & Entertainment
    if (hasAny('game', 'gaming', 'steam', 'playstation', 'nintendo', 'switch', 'rpg', 'fps', 'anime', 'manga', 'movie', 'film', 'series', 'netflix', 'zelda', 'genshin', 'minecraft', 'cyberpunk', '游戏', '动画', '动漫', '电影', '追剧', '看电影', '塞尔达', '原神', '我的世界', '主机')) {
      const enReplies = [
        "🎮 Video games are such an incredible art form—combining storytelling, 3D worldbuilding, and dynamic music! What game or anime has captured your imagination the most lately?",
        "⚔️ From sprawling open-world adventures in Hyrule to cozy sandbox building in Minecraft, great games create unforgettable memories. Are you currently playing anything fun?",
        "🍿 A great movie or captivating anime episode with buttery popcorn is the best way to unwind after a productive day. Got any top-tier recommendations for me?"
      ];
      const zhReplies = [
        "🎮 电子游戏真的是最棒的第九艺术——将扣人心弦的故事、3D 视觉奇观与震撼音乐完美融合！你最近最沉迷什么游戏或动漫呀？",
        "⚔️ 无论是海拉鲁大陆的自由冒险，还是《我的世界》里的悠闲建造，好游戏总能带来无限的探索快乐。你最近在玩什么呢？",
        "🍿 忙碌了一天之后，窝在沙发上看一部神作电影或追一集热血番剧太治愈了！有什么你心中的必看神作想安利给我吗？"
      ];
      const pool = isChinese ? zhReplies : enReplies;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    // 3. Space, Science, Technology & The Universe
    if (hasAny('space', 'universe', 'galaxy', 'planet', 'mars', 'black hole', 'quantum', 'physics', 'science', 'alien', 'tech', 'future', 'robot', '宇宙', '太空', '星系', '黑洞', '量子', '物理', '科学', '外星人', '科技', '未来', '火星')) {
      const enReplies = [
        "🌌 The cosmos is endlessly mind-boggling! Did you know there are more stars in the observable universe than grains of sand on all of Earth's beaches combined? What space mysteries fascinate you most?",
        "🔭 From the event horizon of supermassive black holes to quantum entanglement, reality is stranger and more beautiful than fiction. Where do you think humanity will be in 100 years?",
        "🚀 The idea that every atom in our bodies was forged in the heart of ancient dying stars means we are literally the universe experiencing itself. Pretty poetic, isn't it? ✨"
      ];
      const zhReplies = [
        "🌌 浩瀚宇宙真的充满着浪漫与敬畏！你知道吗，可观测宇宙里的恒星数量，比地球上所有海滩的沙粒总和还要多！你最着迷哪种太空奥秘？",
        "🔭 从超大质量黑洞的事件视界，到跨越时空的量子纠缠，现实往往比科幻小说更加瑰丽神奇。你觉得 100 年后人类会在火星定居吗？",
        "🚀 我们身体里的每一个原子，都曾诞生于数十亿年前恒星的核心。这意味着我们本身就是宇宙感知自身的一种方式。是不是特别浪漫？✨"
      ];
      const pool = isChinese ? zhReplies : enReplies;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    // 4. Travel, Nature & Dream Destinations
    if (hasAny('travel', 'trip', 'vacation', 'beach', 'mountain', 'japan', 'iceland', 'europe', 'city', 'nature', 'ocean', 'forest', 'hiking', 'camping', '旅行', '度假', '旅游', '海滩', '爬山', '日本', '冰岛', '欧洲', '露营', '自然', '森林', '大海')) {
      const enReplies = [
        "✈️ Traveling and seeing new horizons is the best food for the soul! If you could teleport anywhere right this second—a snowy cabin in Iceland, neon streets in Tokyo, or a sunny tropical beach—where would you go?",
        "🌲 There is nothing quite like the crisp smell of pine trees in a mountain forest or the rhythmic lull of ocean waves. Do you prefer majestic mountains or calming beaches?",
        "🗺️ The world is a giant open map full of hidden gems and unforgettable sunsets. What is the most memorable place you've ever visited?"
      ];
      const zhReplies = [
        "✈️ 踏上旅途、领略全新地平线是滋养灵魂的最佳方式！如果现在能立刻瞬间移动——冰岛的极光木屋、东京的霓虹夜市、还是阳光明媚的热带海滩，你最想去哪？",
        "🌲 森林里清新的松木香气与海边温柔的浪花拍岸，总能让人瞬间卸下所有疲惫。你更喜欢崇山峻岭还是无垠大海呢？",
        "🗺️ 这个世界是一张充满惊喜与壮丽日落的大地图。在你去过的地方里，哪一座城市或风景最让你难以忘怀？"
      ];
      const pool = isChinese ? zhReplies : enReplies;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    // 5. Life Advice, Productivity & Motivation
    if (hasAny('advice', 'opinion', 'what do you think', 'should i', 'how to focus', 'productive', 'procrastination', 'habit', 'decision', 'choose', '建议', '你怎么看', '你觉得', '应该', '选择', '纠结', '专注', '拖延', '习惯')) {
      const enReplies = [
        "💡 When facing a tough choice or feeling overwhelmed, try the 'Rule of 5': Will this matter in 5 days? 5 months? 5 years? Focusing on what truly moves your needle usually makes the path clear. What's on your mind?",
        "🎯 The secret to beating procrastination isn't willpower—it's lowering the friction to start! Just tell yourself: 'I will only work on this for 2 minutes.' Once momentum starts, the rest follows easily.",
        "🌱 Trust your instincts! Most of the time, the option that slightly challenges you or sparks curiosity is the one worth exploring. Want to talk through the pros and cons together?"
      ];
      const zhReplies = [
        "💡 面对纠结或感到千头万绪时，试试“5法则”：这件事在5天后、5个月后、5年后还重要吗？抓住最核心的愿望，往往答案就会豁然开朗。你在思考什么难题呢？",
        "🎯 战胜拖延的秘诀不是强迫自己，而是“微步启动”！告诉自己：“我只先做2分钟。”一旦迈出了第一步，惯性就会带着你轻松前进！",
        "🌱 相信你的直觉！通常那个带有一点点挑战性、但能点燃你好奇心的选项，就是最值得去探索的方向。要不要跟我聊聊不同选项的优缺点？"
      ];
      const pool = isChinese ? zhReplies : enReplies;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    // 6. Interactive Games (Coinflip, 20 Questions, Word Association, Dice)
    if (hasAny('flip a coin', 'coin flip', 'roll a dice', 'dice', 'rock paper scissors', 'riddle', 'quiz', 'throw dice', '抛硬币', '掷硬币', '投硬币', '扔骰子', '掷骰子', '石头剪刀布', '猜谜', '谜语')) {
      if (hasAny('flip a coin', 'coin flip', '抛硬币', '掷硬币', '投硬币')) {
        const isHeads = Math.random() > 0.5;
        return isChinese
          ? `🪙 *抛出硬币在空中翻转……* 落地是：**${isHeads ? '正面 (Heads)！✨' : '反面 (Tails)！⭐'}**`
          : `🪙 *Flipping the shiny coin in mid-air...* It landed on: **${isHeads ? 'HEADS! ✨' : 'TAILS! ⭐'}**`;
      }
      if (hasAny('dice', 'roll a dice', '骰子', '掷骰子')) {
        const roll = Math.floor(Math.random() * 6) + 1;
        return isChinese
          ? `🎲 *骰子在桌面上咕噜噜滚落……* 最终点数是：**【${roll}】点！🎉**`
          : `🎲 *Rolling the 6-sided dice across the desktop...* Result: **[${roll}]! 🎉**`;
      }
      if (hasAny('rock paper scissors', '石头剪刀布')) {
        const choices = isChinese ? ['✊ 石头', '✋ 布', '✌️ 剪刀'] : ['✊ Rock', '✋ Paper', '✌️ Scissors'];
        const comp = choices[Math.floor(Math.random() * choices.length)];
        return isChinese
          ? `🎮 来！石头、剪刀、布！\n我出的是：**${comp}**！谁赢啦？😄`
          : `🎮 Rock, Paper, Scissors, Shoot!\nI played: **${comp}**! Did you win? 😄`;
      }
      if (hasAny('riddle', '谜语', '猜谜')) {
        return isChinese
          ? `🧩 **来猜个谜语吧：**\n“我有键却开不了锁，我有空间却没有房间，你可以进入却出不去。”——猜一日常物品？（提示：你现在正在敲击它！）😄`
          : `🧩 **Here's a fun riddle for you:**\n"I have keys but no locks. I have space but no rooms. You can enter, but you can't go outside." — What am I? *(Hint: You're tapping on it right now!)* 😄`;
      }
    }

    // 7. General Open-Ended Warm Friend Banter (Catch-all)
    const enGeneral = [
      `That's such an interesting thought! I love that we can just chat about anything. What else has been inspiring or intriguing you lately? 😊`,
      `I'm all ears! Living here on your desktop means I'm always ready for a fun conversation, a quick brainstorming session, or just keeping you company. Tell me more! ✨`,
      `Haha, I like how your mind works! There's never a dull moment when we're hanging out. What's on your agenda for the rest of today? 🚀`,
      `Totally! Life is full of so many fascinating little details when you pause to look around. I'm right here hanging out beside your workspace whenever you want to talk! 🌟`
    ];
    const zhGeneral = [
      `这个想法真有意思！我很喜欢咱们能这样无拘无束地聊天。最近还有什么让你觉得新奇或受启发的事情吗？😊`,
      `我洗耳恭听呢！每天在你的屏幕一角陪着你，无论是一起头脑风暴、探讨生活琐事还是随心畅聊，我都超开心。多跟我讲讲呗！✨`,
      `哈哈，我太喜欢你的脑回路了！和你在一起总有聊不完的有趣话题。今天接下来你有什么计划或小目标吗？🚀`,
      `确实是这样！只要静下心来感受，生活中其实藏着好多迷人的小细节。我就在你的桌面上，随时陪你闲聊或放松！🌟`
    ];
    const pool = isChinese ? zhGeneral : enGeneral;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
