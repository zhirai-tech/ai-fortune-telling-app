import random
from datetime import datetime

# 扩展基础问题模板 - 增加更多专业深度
base_templates = [
    "易经对{人生阶段}的{方面}发展有何深层指导？",
    "作为{身份角色}，如何在{方面}中体现易经智慧？",
    "从易经角度看{方面}与{方面2}的内在联系？",
    "易经的{哲学概念}如何应用于{方面}实践？",
    "{时间周期}内{方面}的易经运势分析？",
    "如何用易经思维解决{方面}的{复杂问题}？",
    "易经对{行业领域}的{专业问题}有何见解？",
    "在{方面}中如何把握易经强调的{时机概念}？",
    "易经的{系统思维}对{方面}规划的启示？",
    "如何用易经原理优化{方面}的{执行流程}？"
]

# 扩展详细咨询模板 - 增加技术深度
detailed_templates = [
    "请用易经的{分析方法}分析{方面}的{具体情况}？",
    "易经的{卦象理论}如何解释{现象}的深层原因？",
    "在{专业领域}中如何运用易经的{决策原则}？",
    "易经对{技术领域}的{创新挑战}有何应对智慧？",
    "如何用易经的{平衡理念}处理{方面}的{矛盾冲突}？",
    "易经的{变化观}对{方面}的{发展趋势}预测？",
    "在{复杂情境}中如何应用易经的{应变智慧}？",
    "易经的{整体观}对{方面}的{系统优化}建议？"
]

# 新增专业深度咨询模板
professional_depth_templates = [
    "从易经{理论体系}分析{行业领域}的{发展规律}？",
    "易经的{思维模式}如何助力{专业领域}的{突破创新}？",
    "在{学术研究}中如何融入易经的{方法论}？",
    "易经对{技术演进}的{路径选择}有何启示？",
    "如何用易经智慧应对{行业变革}的{不确定性}？",
    "易经的{价值理念}对{商业实践}的{伦理指导}？",
    "在{管理领域}如何运用易经的{领导智慧}？",
    "易经对{科技创新}的{风险评估}和{机遇把握}？"
]

# 新增文化哲学深度模板
cultural_philosophy_templates = [
    "易经的{宇宙观}对{现代科学}的{启示意义}？",
    "如何在{当代社会}传承易经的{文化精髓}？",
    "易经的{伦理思想}对{社会问题}的{解决思路}？",
    "从易经看{人类文明}的{发展方向}和{价值取向}？",
    "易经的{和谐理念}对{全球问题}的{应对智慧}？",
    "如何在{个人成长}中实践易经的{修养之道}？",
    "易经的{辩证思维}对{复杂决策}的{指导价值}？",
    "从易经角度探讨{生命意义}和{存在价值}？"
]

# 扩展词汇库
complex_problem_options = [
    "结构性矛盾", "系统性风险", "多目标冲突", "资源约束",
    "信息不对称", "利益博弈", "环境变化", "技术瓶颈"
]

timing_concept_options = [
    "时机把握", "节奏控制", "阶段转换", "周期循环",
    "趋势跟随", "逆向操作", "提前布局", "及时调整"
]

system_thinking_options = [
    "全局观念", "关联思维", "层次分析", "动态平衡",
    "反馈调节", "协同优化", "整体效能", "可持续发展"
]

execution_process_options = [
    "实施步骤", "进度控制", "质量保障", "风险管控",
    "资源调配", "团队协作", "效果评估", "持续改进"
]

analysis_method_options = [
    "卦象推演", "爻位分析", "阴阳辩证", "五行生克",
    "八卦对应", "六爻变化", "象数结合", "理占统一"
]

decision_principle_options = [
    "趋吉避凶", "把握中庸", "顺势而为", "变通适应",
    "厚积薄发", "以柔克刚", "居安思危", "未雨绸缪"
]

innovation_challenge_options = [
    "技术突破", "模式创新", "市场开拓", "资源整合",
    "人才培育", "风险管理", "合规经营", "持续发展"
]

contradiction_conflict_options = [
    "利益冲突", "价值冲突", "角色冲突", "资源冲突",
    "时间冲突", "空间冲突", "理念冲突", "情感冲突"
]

development_trend_options = [
    "上升期", "调整期", "转型期", "突破期",
    "稳定期", "波动期", "衰退期", "复兴期"
]

complex_situation_options = [
    "多变环境", "激烈竞争", "资源匮乏", "时间紧迫",
    "信息复杂", "关系微妙", "风险叠加", "利益多元"
]

theoretical_system_options = [
    "阴阳理论", "五行学说", "八卦体系", "六十四卦系统",
    "爻位理论", "卦变学说", "象数理论", "易理体系"
]

thinking_mode_options = [
    "整体思维", "辩证思维", "象数思维", "直觉思维",
    "系统思维", "循环思维", "平衡思维", "应变思维"
]

academic_research_options = [
    "理论研究", "实证研究", "比较研究", "历史研究",
    "应用研究", "跨学科研究", "创新研究", "传承研究"
]

methodology_options = [
    "研究方法", "分析框架", "论证逻辑", "验证手段",
    "数据采集", "模型构建", "理论推导", "实践检验"
]

technology_evolution_options = [
    "技术路线", "创新路径", "升级方向", "融合趋势",
    "替代风险", "互补机会", "突破点", "瓶颈点"
]

industry_change_options = [
    "数字化转型", "绿色发展", "全球化调整", "消费升级",
    "技术革命", "政策变革", "市场竞争", "供应链重构"
]

management_field_options = [
    "战略管理", "组织管理", "人力资源管理", "运营管理",
    "创新管理", "风险管理", "文化管理", "变革管理"
]

leadership_wisdom_options = [
    "决策艺术", "用人智慧", "沟通技巧", "激励方法",
    "危机处理", "团队建设", "愿景引领", "文化塑造"
]

scientific_innovation_options = [
    "基础研究", "应用开发", "成果转化", "产业孵化",
    "技术标准", "知识产权", "合作创新", "自主创新"
]

cosmic_view_options = [
    "天人合一", "道法自然", "阴阳消长", "五行运转",
    "八卦对应", "六爻变化", "时空统一", "万物互联"
]

modern_science_options = [
    "量子物理", "宇宙学", "生命科学", "信息科学",
    "系统科学", "复杂性科学", "认知科学", "环境科学"
]

cultural_essence_options = [
    "哲学智慧", "道德理念", "审美价值", "实践方法",
    "思维方式", "价值观念", "行为准则", "精神追求"
]

social_problem_options = [
    "贫富差距", "教育公平", "医疗资源", "环境保护",
    "人口老龄化", "城乡差异", "文化冲突", "道德滑坡"
]

human_civilization_options = [
    "科技发展", "文化繁荣", "社会进步", "生态平衡",
    "国际合作", "和平发展", "文明对话", "共同命运"
]

global_issue_options = [
    "气候变化", "能源危机", "粮食安全", "公共卫生",
    "经济波动", "恐怖主义", "数字鸿沟", "文化多样性"
]

personal_growth_options = [
    "心智成熟", "能力提升", "品德修养", "人际关系",
    "职业发展", "家庭幸福", "身心健康", "人生意义"
]

cultivation_way_options = [
    "静坐冥想", "读书明理", "实践体悟", "师友切磋",
    "反躬自省", "顺应自然", "修养心性", "提升境界"
]

life_meaning_options = [
    "存在价值", "生命意义", "人生目标", "幸福追求",
    "社会责任", "历史使命", "精神寄托", "终极关怀"
]

# 优化复合问题模板
complex_templates = [
    "我{方面}和{方面2}都有困扰，{时间}应该优先处理哪个？",
    "{人}的{方面}对我{方面2}是否有影响？该如何应对？",
    "我{方面}遇到{问题}，同时{方面2}也出现{情况}，易经有何综合建议？",
    "{时间}计划{行动}，但{方面}不顺且{方面2}有{问题}，该如何决策？",
    "我{方面}的{问题}是否与{现象}有关？与{人}的{方面}是否关联？",
    "{方面}不顺导致{方面2}也出现问题，易经认为根本原因是什么？",
    "我{方面}近期{情况}，{方面2}也{问题}，这是巧合还是有关联？",
    "{人}{事件}影响了我的{方面}，进而导致{方面2}{情况}，如何化解？",
    "我{方面}的{选择项}与{方面2}的{选择项2}冲突，易经如何权衡？",
    "{时间}{方面}和{方面2}都将有变化，应如何统筹应对？"
]

# 优化对话场景模板
dialogue_templates = [
    "用户：老师，我{方面}近期{问题}，{情感}，请您指点。\n助手：",
    "用户：{人}即将{事件}，我{方面}又{情况}，{情感}，请帮我看一下。\n助手：",
    "用户：我计划{行动}，但{方面}不顺，{情感}，易经有何建议？\n助手：",
    "用户：{时间}我{方面}和{方面2}都出现问题，{情感}，该如何处理？\n助手：",
    "用户：老师，我{方面}突然{情况}，{情感}，请问如何应对？\n助手：",
    "用户：我{方面}的{问题}影响到{人}也{情况}，{情感}，该怎么办？\n助手：",
    "用户：{时间}适合{行动}吗？我{方面}近期{问题}，{情感}。\n助手：",
    "用户：我{方面}和{人}的{方面2}有矛盾，{情感}，易经如何看待？\n助手："
]

# 新增专业咨询模板
professional_templates = [
    "根据易经原理，{方面}的最佳发展方向是什么？",
    "易经中哪一卦最能代表当前{方面}的态势？",
    "从易经角度看，{方面}的根本问题是什么？",
    "易经的阴阳平衡理论如何应用于{方面}？",
    "在{方面}中，如何运用易经的变通智慧？",
    "易经的卦象如何解读{方面}的吉凶？",
    "从易经哲学角度，如何看待{方面}的成败？",
    "易经的时间观对{方面}的时机选择有何启示？",
    "如何运用易经智慧化解{方面}的矛盾？",
    "易经的养生之道对{方面}有何指导意义？"
]

# 紧急求助模板
emergency_templates = [
    "紧急求助！我{方面}突然{紧急情况}，易经有何应急指导？",
    "{时间}发生{突发事件}，对我{方面}有何影响？如何应对？",
    "我{方面}面临{危机}，易经的危机处理智慧是什么？",
    "突发{情况}导致我{方面}受阻，易经如何解困？",
    "紧急！{人}的{问题}影响我{方面}，该如何快速化解？"
]

# 基础词汇库
time_options = ["最近", "近期", "这个月", "下个月", "今年", "明年", "未来三个月", "未来半年"]
aspect_options = ["事业", "财运", "感情", "健康", "学业", "家庭", "人际关系", "投资", "工作", "创业"]
action_options = ["投资", "跳槽", "创业", "结婚", "买房", "旅行", "学习", "合作", "谈判", "转型"]
phenomenon_options = ["反复不顺", "突然好转", "持续低迷", "波动不定", "稳步上升", "急剧下滑"]
people_options = ["上司", "同事", "伴侣", "家人", "朋友", "合作伙伴", "竞争对手", "客户"]
event_options = ["升职", "调岗", "离职", "结婚", "分手", "生病", "投资", "合作", "竞争", "考试"]
project_options = ["新项目", "重要决策", "投资计划", "合作事宜", "职业规划", "学习计划"]
problem_options = ["进展缓慢", "遇到阻碍", "方向不明", "资源不足", "竞争激烈", "时间紧迫"]
situation_options = ["不顺", "有起色", "停滞", "好转", "恶化", "稳定", "波动"]
dream_types = ["预知梦", "反复梦", "噩梦", "美梦", "奇怪梦"]
symptom_options = ["失眠", "焦虑", "压力大", "疲惫", "情绪低落", "注意力不集中"]
choice_options = ["选项A", "选项B", "方案一", "方案二", "方向一", "方向二"]
emotional_expressions = ["很焦虑", "很困惑", "很着急", "很迷茫", "很担忧", "很期待", "很兴奋", "很沮丧"]

def generate_divination_questions(templates, num_questions):
    """生成易经占卜专业问题"""
    questions = []
    
    # 扩展词汇映射
    extended_placeholders = {
        '{人生阶段}': ['青年期', '中年期', '老年期', '创业期', '成长期', '转型期'],
        '{身份角色}': ['管理者', '创业者', '学者', '职场新人', '专业人士', '投资者'],
        '{哲学概念}': ['阴阳平衡', '五行生克', '八卦对应', '变易之道', '中庸之道'],
        '{时间周期}': ['近期', '本月', '本季度', '今年', '未来三年'],
        '{行业领域}': ['科技行业', '金融业', '教育领域', '医疗健康', '文化产业'],
        '{专业问题}': ['发展战略', '竞争策略', '创新方向', '风险管理', '人才建设'],
        '{具体情况}': ['当前困境', '发展机遇', '潜在风险', '核心问题', '关键节点'],
        '{专业领域}': ['企业管理', '投资决策', '技术创新', '市场开拓', '团队建设'],
        '{技术领域}': ['人工智能', '区块链', '生物科技', '新能源', '数字化转型'],
        '{复杂情境}': complex_situation_options,
        '{理论体系}': theoretical_system_options,
        '{思维模式}': thinking_mode_options,
        '{学术研究}': academic_research_options,
        '{方法论}': methodology_options,
        '{技术演进}': technology_evolution_options,
        '{行业变革}': industry_change_options,
        '{管理领域}': management_field_options,
        '{科技创新}': scientific_innovation_options,
        '{宇宙观}': cosmic_view_options,
        '{现代科学}': modern_science_options,
        '{当代社会}': ['现代社会', '数字时代', '全球化背景', '多元文化环境'],
        '{文化精髓}': cultural_essence_options,
        '{伦理思想}': ['仁义道德', '诚信理念', '和谐价值观', '责任意识'],
        '{社会问题}': social_problem_options,
        '{人类文明}': human_civilization_options,
        '{全球问题}': global_issue_options,
        '{个人成长}': personal_growth_options,
        '{修养之道}': cultivation_way_options,
        '{复杂决策}': ['战略选择', '投资决策', '人生重大选择', '职业转折点'],
        '{生命意义}': life_meaning_options,
        '{复杂问题}': complex_problem_options,
        '{时机概念}': timing_concept_options,
        '{系统思维}': system_thinking_options,
        '{执行流程}': execution_process_options,
        '{分析方法}': analysis_method_options,
        '{卦象理论}': ['六爻理论', '八卦学说', '卦变原理', '象数理论'],
        '{决策原则}': decision_principle_options,
        '{创新挑战}': innovation_challenge_options,
        '{平衡理念}': ['阴阳平衡', '刚柔相济', '中庸之道', '和谐统一'],
        '{矛盾冲突}': contradiction_conflict_options,
        '{变化观}': ['变易思想', '阴阳转化', '物极必反', '循环往复'],
        '{发展趋势}': development_trend_options,
        '{应变智慧}': ['随机应变', '顺势而为', '以变应变', '通权达变'],
        '{整体观}': ['天人合一', '全局观念', '系统思维', '整体把握'],
        '{系统优化}': ['结构调整', '流程再造', '资源配置', '效能提升'],
        '{发展规律}': ['周期规律', '兴衰规律', '成长规律', '变化规律'],
        '{突破创新}': ['技术突破', '模式创新', '思维突破', '能力突破'],
        '{路径选择}': ['发展方向', '实施路径', '策略选择', '方法路径'],
        '{不确定性}': ['市场波动', '政策变化', '技术风险', '竞争不确定性'],
        '{价值理念}': ['诚信为本', '和谐共赢', '可持续发展', '社会责任'],
        '{伦理指导}': ['道德规范', '行为准则', '价值取向', '责任担当'],
        '{领导智慧}': leadership_wisdom_options,
        '{风险评估}': ['风险识别', '风险分析', '风险应对', '风险控制'],
        '{机遇把握}': ['机会识别', '时机把握', '资源整合', '优势发挥'],
        '{启示意义}': ['理论启示', '方法启示', '思维启示', '实践启示'],
        '{解决思路}': ['对策建议', '方法路径', '原则指导', '实践方案'],
        '{发展方向}': ['未来趋势', '演进方向', '进步路径', '发展前景'],
        '{价值取向}': ['价值追求', '目标导向', '意义建构', '精神归宿'],
        '{应对智慧}': ['解决之道', '应对策略', '方法智慧', '实践指导'],
        '{指导价值}': ['理论价值', '实践意义', '方法价值', '思维价值'],
        '{存在价值}': life_meaning_options
    }
    
    # 基础占位符映射
    base_placeholders = {
        '{时间}': time_options,
        '{方面}': aspect_options,
        '{行动}': action_options,
        '{现象}': phenomenon_options,
        '{人}': people_options,
        '{事件}': event_options,
        '{项目}': project_options,
        '{问题}': problem_options,
        '{情况}': situation_options,
        '{类型}': dream_types,
        '{症状}': symptom_options,
        '{选择项}': choice_options,
        '{方面2}': aspect_options,
        '{选择项2}': choice_options,
        '{情感}': emotional_expressions,
        '{紧急情况}': ['严重问题', '重大危机', '突发状况', '紧急事件'],
        '{危机}': ['信任危机', '财务危机', '健康危机', '关系危机'],
        '{突发事件}': ['意外变化', '突发问题', '紧急状况', '意外事件']
    }
    
    # 合并所有占位符映射
    all_placeholders = {**base_placeholders, **extended_placeholders}
    
    for _ in range(num_questions):
        template = random.choice(templates)
        question = template
        
        # 替换所有占位符
        used_values = {}  # 记录已使用的值，避免重复
        
        for placeholder, options in all_placeholders.items():
            if placeholder in question:
                # 对于相同的占位符类型，使用不同的值
                placeholder_type = placeholder.replace('{', '').replace('}', '')
                if placeholder_type in used_values:
                    used_options = used_values[placeholder_type]
                    available_options = [opt for opt in options if opt not in used_options]
                    if available_options:
                        choice = random.choice(available_options)
                        used_options.append(choice)
                    else:
                        choice = random.choice(options)
                else:
                    choice = random.choice(options)
                    used_values[placeholder_type] = [choice]
                
                question = question.replace(placeholder, choice, 1)
        
        # 适度添加情感表达，避免过度情绪化
        if random.random() < 0.3:  # 降低情感词使用频率
            emotional_word = random.choice(emotional_expressions)
            # 更自然地插入情感词
            if "困扰" in question or "问题" in question or "不顺" in question:
                question = question.replace("困扰", emotional_word + "的困扰", 1)
            elif "。" in question:
                question = question.replace("。", f"，{emotional_word}。", 1)
        
        questions.append(question)
    
    return questions

def generate_conversation_scenarios(num_scenarios):
    """生成专业对话场景"""
    scenarios = []
    
    opening_phrases = [
        "老师您好，", "请教一下，", "请问", "麻烦您", "向您请教，",
        "最近有些困惑，", "有个问题想请教，", "不知该如何处理，", 
        "请教老师，", "请问专家，", "您好，", "诚心请教，"
    ]
    
    # 生成更多专业问题用于对话
    base_questions = generate_divination_questions(
        base_templates + detailed_templates + professional_templates, 
        num_scenarios * 3
    )
    
    for i in range(num_scenarios):
        if i < len(base_questions):
            user_question = base_questions[i]
        else:
            user_question = generate_divination_questions(base_templates, 1)[0]
            
        opening = random.choice(opening_phrases)
        
        # 更自然的对话开头
        scenario = f"用户：{opening}{user_question}\n助手："
        scenarios.append(scenario)
    
    return scenarios

def generate_complex_questions(num_questions):
    """生成专业复合问题"""
    return generate_divination_questions(complex_templates, num_questions)

def generate_dialogue_questions(num_questions):
    """生成专业对话问题"""
    return generate_divination_questions(dialogue_templates, num_questions)

def generate_professional_questions(num_questions):
    """生成专业咨询问题"""
    return generate_divination_questions(professional_templates, num_questions)

def generate_followup_questions():
    """生成专业后续追问"""
    followups = [
        "这个卦象的具体含义是什么？",
        "如果结果不理想，有什么改善方法？",
        "这个预测对我的{方面}具体意味着什么？",
        "需要采取什么具体行动来改善情况？",
        "这个预测的时间范围是怎样的？",
        "在过程中需要注意什么？",
        "需要配合什么方法来增强效果？",
        "结果会随着我的努力改变吗？",
        "还有其他角度的解读吗？",
        "能给我更具体的建议吗？",
        "这个解读需要什么信息？",
        "什么时候能见到效果？",
        "准确度如何？",
        "需要结合其他信息一起看吗？",
        "这个卦象与我的情况匹配度如何？",
        "我需要如何调整才能改善结果？",
        "这个预测涵盖什么时间段？",
        "我应该重点关注什么？",
        "有什么具体的方法建议？",
        "这个结果的可靠性如何？",
        "我{方面}的问题需要重视吗？",
        "在{时间}内会有改善吗？",
        "我需要注意{方面}的什么细节？",
        "有什么具体的实施建议？",
        "我{方面}的{问题}何时能缓解？"
    ]
    
    result = []
    for followup in followups:
        if '{方面}' in followup:
            for aspect in random.sample(aspect_options, min(5, len(aspect_options))):
                result.append(followup.replace('{方面}', aspect))
        else:
            result.append(followup)
    
    return result

def save_questions(questions, filename):
    """保存问题到文件"""
    with open(filename, 'w', encoding='utf-8') as f:
        for question in questions:
            f.write(question + '\n')

def main():
    """主函数：生成专业易经占卜问题"""
    print("开始生成专业易经占卜问题...")
    
    # 生成各种类型的问题 - 增加新的问题类型
    print("生成基础咨询问题...")
    basic_questions = generate_divination_questions(base_templates, 2000)
    
    print("生成详细咨询问题...")
    detailed_questions = generate_divination_questions(detailed_templates, 1500)
    
    print("生成专业深度问题...")
    professional_depth_questions = generate_divination_questions(professional_depth_templates, 1200)
    
    print("生成文化哲学问题...")
    cultural_philosophy_questions = generate_divination_questions(cultural_philosophy_templates, 1000)
    
    print("生成紧急求助问题...")
    emergency_questions = generate_divination_questions(emergency_templates, 800)
    
    print("生成复合问题...")
    complex_questions = generate_complex_questions(600)
    
    print("生成对话问题...")
    dialogue_questions = generate_dialogue_questions(600)
    
    print("生成多轮对话场景...")
    conversation_scenarios = generate_conversation_scenarios(800)
    
    print("生成后续追问问题...")
    followup_questions = generate_followup_questions()
    
    # 合并所有问题
    all_questions = (basic_questions + detailed_questions + professional_depth_questions + 
                    cultural_philosophy_questions + emergency_questions + complex_questions + 
                    dialogue_questions + conversation_scenarios + followup_questions)
    
    print(f"合并后共有 {len(all_questions)} 个问题")
    
    # 去重和打乱顺序
    unique_questions = list(set(all_questions))
    random.shuffle(unique_questions)
    
    print(f"去重后共有 {len(unique_questions)} 个问题")
    
    # 智能补充策略
    max_iterations = 5
    iteration = 0
    
    while len(unique_questions) < 15000 and iteration < max_iterations:  # 提升到15000个问题
        iteration += 1
        needed = 15000 - len(unique_questions)
        print(f"第{iteration}次补充，需要{needed}个问题...")
        
        # 使用更多样化的模板组合
        all_templates = (base_templates + detailed_templates + professional_depth_templates + 
                        cultural_philosophy_templates + emergency_templates + complex_templates)
        additional_questions = generate_divination_questions(
            all_templates, 
            min(3000, needed * 3)  # 生成更多问题
        )
        
        # 合并并去重
        unique_questions.extend(additional_questions)
        unique_questions = list(set(unique_questions))
        print(f"补充后共有 {len(unique_questions)} 个问题")
    
    # 最终确保达到目标数量
    if len(unique_questions) > 15000:
        unique_questions = unique_questions[:15000]
    
    # 保存到文件
    output_file = '../prompts/divination.txt'
    save_questions(unique_questions, output_file)
    
    print(f"\n最终生成 {len(unique_questions)} 个专业易经问题")
    print("问题类型分布:")
    print(f"- 基础咨询: {len(basic_questions)}")
    print(f"- 详细咨询: {len(detailed_questions)}")
    print(f"- 专业深度: {len(professional_depth_questions)}")
    print(f"- 文化哲学: {len(cultural_philosophy_questions)}")
    print(f"- 紧急求助: {len(emergency_questions)}")
    print(f"- 复合问题: {len(complex_questions)}")
    print(f"- 对话问题: {len(dialogue_questions)}")
    print(f"- 对话场景: {len(conversation_scenarios)}")
    print(f"- 后续追问: {len(followup_questions)}")

if __name__ == "__main__":
    main()