/**
 * Physics Domain Tools
 * Handles Newtonian window physics, gravity acceleration, elasticity bounce, and floor collision.
 */

export const PhysicsTools = {
  name: 'physics',
  tools: [
    {
      name: 'setPhysics',
      description: 'Configure Newtonian window physics, gravity acceleration, elasticity, and floor collision.',
      parameters: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', description: 'Enable window physics & toss momentum' },
          gravity: { type: 'number', description: 'Gravity acceleration (e.g. 9.8 standard)' },
          elasticity: { type: 'number', description: 'Bounce elasticity (0.0 to 1.0)' },
          physicsFloor: { type: 'boolean', description: 'Lock character above taskbar floor' }
        }
      },
      sanitize: (args, settings) => {
        const clampNum = (v, min, max, def) => {
          const num = parseFloat(v);
          if (isNaN(num)) return def;
          return parseFloat(Math.max(min, Math.min(max, num)).toFixed(2));
        };
        return {
          enabled: args.enabled !== undefined ? !!args.enabled : settings.enablePhysics,
          gravity: clampNum(args.gravity, 0, 50, settings.physicsGravity || 9.8),
          elasticity: clampNum(args.elasticity, 0, 1.0, settings.physicsElasticity || 0.7),
          physicsFloor: args.physicsFloor !== undefined ? !!args.physicsFloor : (settings.physicsFloor !== false)
        };
      },
      execute: (args, ctx) => {
        const s = ctx.currentSettings;
        if (args.enabled !== undefined) {
          s.enablePhysics = args.enabled;
          ctx.syncUI('enable-physics', args.enabled, true);
        }
        if (args.gravity !== undefined) {
          s.physicsGravity = args.gravity;
          ctx.syncUI('physics-gravity', args.gravity);
        }
        if (args.elasticity !== undefined) {
          s.physicsElasticity = args.elasticity;
          ctx.syncUI('physics-elasticity', args.elasticity);
        }
        if (args.physicsFloor !== undefined) {
          s.physicsFloor = args.physicsFloor;
          ctx.syncUI('physics-floor', args.physicsFloor, true);
        }
        return `Physics: ${s.enablePhysics ? 'ENABLED' : 'DISABLED'} (Gravity=${s.physicsGravity}m/s²)`;
      }
    }
  ],

  parseIntent: (text, currentSettings, isChinese) => {
    const toolCalls = [];
    const actionsSummary = [];

    const isPhysicsTopic = /\b(physics|gravity|newtonian|bounce|toss|drop)\b/i.test(text) ||
                           ['物理', '重力', '掉落', '弹跳', '抛掷', '下落'].some(w => text.includes(w));

    if (isPhysicsTopic) {
      // Explicit disable requires negation directed at physics/gravity (avoid loose 'off' like 'bounces off the floor')
      const isExplicitEnable = /\b(enable|turn on|start|activate)\s+(?:window\s+)?(?:physics|gravity)\b/i.test(text) || ['开启物理', '打开物理', '启用物理'].some(w => text.includes(w));
      const isDisable = !isExplicitEnable && (
        /\b(disable|disabled|turn off|turned off|stop|shut off|clear|cancel|don't want|dont want|do not want|dont need|don't need|without|no more|not want)\s+(?:window\s+)?(?:physics|gravity|bounce|toss)?\b/i.test(text) ||
        /\b(?:physics|gravity)\s+(?:off|disabled|stopped)\b/i.test(text) ||
        ['关闭物理', '关物理', '停止物理', '关掉物理', '无重力', '关闭重力', '不要物理', '不想要物理', '不需要重力'].some(w => text.includes(w))
      );

      if (isDisable) {
        toolCalls.push({ name: 'setPhysics', args: { enabled: false } });
        actionsSummary.push(isChinese ? '关闭了物理引擎' : 'disabled window physics');
      } else {
        const gravMatch = text.match(/gravity\s*(?:to|=)?\s*([0-9]+(?:\.[0-9]+)?)/i) || text.match(/重力\s*([0-9]+(?:\.[0-9]+)?)/);
        const gravity = gravMatch ? parseFloat(gravMatch[1]) : (currentSettings.physicsGravity || 9.8);
        toolCalls.push({ name: 'setPhysics', args: { enabled: true, gravity, elasticity: 0.7, physicsFloor: true } });
        actionsSummary.push(isChinese ? `开启了物理引擎与重力 (${gravity}m/s²)` : `enabled gravity physics (${gravity} m/s²)`);
      }
    }

    return { toolCalls, actionsSummary };
  }
};
