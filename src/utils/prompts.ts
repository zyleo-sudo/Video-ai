import { PromptTemplate } from '../types';

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // 电影效果
  {
    id: 'movie-cinematic',
    name: '电影质感',
    category: '电影效果',
    prompt: 'A cinematic {scene} shot with dramatic lighting, shallow depth of field, and smooth camera movement. 4K quality, film grain, color graded like a Hollywood production.',
    description: '专业电影级质感，戏剧性光影',
    variables: ['scene'],
  },
  {
    id: 'movie-action',
    name: '动作大片',
    category: '电影效果',
    prompt: 'An intense {action} sequence with dynamic camera angles, fast cuts, and motion blur. High contrast lighting, professional stunt choreography, blockbuster action movie style.',
    description: '高能量动作场景，好莱坞大片风格',
    variables: ['action'],
  },
  {
    id: 'movie-documentary',
    name: '纪录片',
    category: '电影效果',
    prompt: 'A documentary-style shot of {subject}, natural lighting, handheld camera movement, authentic feel, observational cinematography.',
    description: '真实纪录片风格，自然光拍摄',
    variables: ['subject'],
  },

  // 电商广告
  {
    id: 'ecom-luxury',
    name: '奢华产品',
    category: '电商广告',
    prompt: 'Elegant product showcase of {product}, luxury aesthetic, soft studio lighting, slow rotation, shallow depth of field, premium feel, black or white background.',
    description: '高端奢华产品展示，专业摄影棚',
    variables: ['product'],
  },
  {
    id: 'ecom-tech',
    name: '科技产品',
    category: '电商广告',
    prompt: 'Modern tech product video of {product}, sleek design, blue accent lighting, dynamic camera movements, futuristic UI elements floating, clean white background.',
    description: '现代科技产品，未来感设计',
    variables: ['product'],
  },
  {
    id: 'ecom-beauty',
    name: '美妆护肤',
    category: '电商广告',
    prompt: 'Beauty and skincare product shot of {product}, soft diffused lighting, gentle rotation, glowing skin texture, elegant packaging, pink gradient background.',
    description: '美妆护肤品，柔美光线效果',
    variables: ['product'],
  },
  {
    id: 'ecom-fashion',
    name: '时尚服饰',
    category: '电商广告',
    prompt: 'Fashion showcase of {clothing}, model wearing the item, runway lighting, slow catwalk movement, elegant pose, fashion magazine aesthetic.',
    description: '时尚服饰展示，T台走秀风格',
    variables: ['clothing'],
  },
  {
    id: 'ecom-food',
    name: '美食餐饮',
    category: '电商广告',
    prompt: 'Appetizing food video of {food}, steam rising, fresh ingredients, bright natural lighting, macro shots, slow motion splashes, vibrant colors.',
    description: '诱人美食特写，色彩鲜艳',
    variables: ['food'],
  },

  // 社交媒体
  {
    id: 'social-tiktok',
    name: '抖音快手',
    category: '社交媒体',
    prompt: 'Trending TikTok-style video: {content}. Vertical format, quick transitions, upbeat energy, Gen Z aesthetic, attention-grabbing from first second.',
    description: '短视频平台风格，吸引眼球',
    variables: ['content'],
  },
  {
    id: 'social-instagram',
    name: 'Instagram',
    category: '社交媒体',
    prompt: 'Instagram Reel featuring {subject}. Aesthetic color grading, smooth transitions, trendy music vibes, visually pleasing composition, shareable moment.',
    description: 'Instagram 精致风格，网红级质感',
    variables: ['subject'],
  },
  {
    id: 'social-youtube',
    name: 'YouTube 短片',
    category: '社交媒体',
    prompt: 'YouTube Short about {topic}. Engaging hook in first second, dynamic editing, text overlays, clear visual storytelling, retention-optimized pacing.',
    description: 'YouTube Shorts 格式，高完播率',
    variables: ['topic'],
  },

  // 教育科普
  {
    id: 'edu-explainer',
    name: '科普解说',
    category: '教育科普',
    prompt: 'Educational animation explaining {concept}. Clear visuals, simple graphics, professional narrator style, easy to understand, engaging presentation.',
    description: '清晰易懂的科普动画',
    variables: ['concept'],
  },
  {
    id: 'edu-tutorial',
    name: '教程演示',
    category: '教育科普',
    prompt: 'Step-by-step tutorial showing {process}. Clear close-ups, highlighted actions, professional demonstration, easy-to-follow visual instructions.',
    description: '分步骤教程演示',
    variables: ['process'],
  },
  {
    id: 'edu-science',
    name: '科学可视化',
    category: '教育科普',
    prompt: 'Scientific visualization of {phenomenon}. Accurate representation, smooth motion, educational graphics, documentary-style narration, immersive.',
    description: '科学现象可视化，专业准确',
    variables: ['phenomenon'],
  },

  // 风景旅游
  {
    id: 'landscape-drone',
    name: '无人机航拍',
    category: '风景旅游',
    prompt: 'Breathtaking drone footage of {location}. Sweeping aerial views, golden hour lighting, epic scale, cinematic movement, travel documentary quality.',
    description: '震撼航拍视角，电影级质感',
    variables: ['location'],
  },
  {
    id: 'landscape-timelapse',
    name: '延时摄影',
    category: '风景旅游',
    prompt: 'Stunning time-lapse of {scene}. Smooth motion, changing light, stars moving or clouds flowing, professional quality, hypnotic rhythm.',
    description: '精美延时摄影，流动的美',
    variables: ['scene'],
  },
  {
    id: 'landscape-nature',
    name: '自然纪录片',
    category: '风景旅游',
    prompt: 'Nature documentary shot of {subject}. Wildlife behavior, natural habitat, authentic moments, National Geographic style, respectful observation.',
    description: '国家地理风格自然纪录片',
    variables: ['subject'],
  },

  // 艺术创意
  {
    id: 'art-3d',
    name: '3D 动画',
    category: '艺术创意',
    prompt: 'A high-quality 3D animation of {subject}, Pixar-style rendering, vibrant colors, smooth motion, expressive characters, family-friendly content.',
    description: '皮克斯风格 3D 动画',
    variables: ['subject'],
  },
  {
    id: 'art-anime',
    name: '日系动漫',
    category: '艺术创意',
    prompt: 'An anime-style scene of {subject}, Japanese animation aesthetics, cel shading, dynamic poses, expressive facial features, vibrant colors.',
    description: '日系动漫风格，二次元美学',
    variables: ['subject'],
  },
  {
    id: 'art-stopmotion',
    name: '定格动画',
    category: '艺术创意',
    prompt: 'A stop-motion animation of {subject}, claymation style, frame-by-frame animation, tactile texture, quirky and charming movement.',
    description: '粘土定格动画，独特质感',
    variables: ['subject'],
  },
  {
    id: 'art-abstract',
    name: '抽象艺术',
    category: '艺术创意',
    prompt: 'Abstract video art: {description}. Flowing colors, geometric shapes, mesmerizing patterns, experimental visuals, artistic expression.',
    description: '抽象艺术视觉，实验性创意',
    variables: ['description'],
  },
  {
    id: 'art-particle',
    name: '粒子特效',
    category: '艺术创意',
    prompt: '{element} particle effects. Thousands of particles flowing, physics-based movement, glowing elements, ethereal atmosphere, slow motion.',
    description: '唯美粒子特效，流动光影',
    variables: ['element'],
  },

  // 商业展示
  {
    id: 'business-corporate',
    name: '企业形象',
    category: '商业展示',
    prompt: 'Corporate video showcasing {company}. Professional lighting, clean composition, modern office background, smooth camera movement, trustworthy impression.',
    description: '企业形象宣传片，专业商务',
    variables: ['company'],
  },
  {
    id: 'business-architecture',
    name: '建筑展示',
    category: '商业展示',
    prompt: 'Architectural visualization of {building}. Clean lines, modern design, dramatic lighting, drone footage, professional real estate quality.',
    description: '建筑可视化，房地产展示',
    variables: ['building'],
  },
  {
    id: 'business-app',
    name: 'APP 演示',
    category: '商业展示',
    prompt: 'App demonstration of {feature}. Clean UI, smooth transitions, professional mockup, clear feature highlighting, tech product launch style.',
    description: 'APP 功能演示，科技感十足',
    variables: ['feature'],
  },
];

// Get templates by category
export function getTemplatesByCategory(category: string): PromptTemplate[] {
  return PROMPT_TEMPLATES.filter(t => t.category === category);
}

// Get all categories
export function getCategories(): string[] {
  return Array.from(new Set(PROMPT_TEMPLATES.map(t => t.category)));
}

// Get template by ID
export function getTemplateById(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find(t => t.id === id);
}

// Apply template with variables
export function applyTemplate(template: PromptTemplate, values: Record<string, string>): string {
  let prompt = template.prompt;
  if (template.variables) {
    for (const variable of template.variables) {
      const value = values[variable] || `{${variable}}`;
      prompt = prompt.replace(new RegExp(`\\{${variable}\\}`, 'g'), value);
    }
  }
  return prompt;
}
