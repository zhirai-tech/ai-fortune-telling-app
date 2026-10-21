import random
from datetime import datetime

# 优化基础问题模板 - 更加专业和有深度
base_templates = [
    "我想用易经占卜{时间}{方面}的运势，应该如何起卦和解读？",
    "近期{方面}遇到困难，易经中哪一卦能给我启示？",
    "{方面}发展遇到瓶颈，易经能提供什么智慧指导？",
    "我计划{行动}，易经卦象对此有何预示？",
    "关于{方面}的决策，易经能给我什么建议？",
    "近期{现象}频发，易经如何看待这种现象？",
    "家人{人}健康欠佳，易经有何养生调理的建议？",
    "{人}即将{事件}，易经能预测此事吉凶吗？",
    "{方面}面临危机，易经的应对之道是什么？",
    "投资{项目}，易经对风险有何警示？",
    "{方面}存在{问题}，易经的化解方法有哪些？",
    "准备{行动}，易经提醒需要注意什么？",
    "{时间}{方面}是否会出现转机？",
    "易经如何看待我在{方面}的缘分？",
    "{方面}面临选择困境，易经能指引方向吗？",
    "我想了解{方面}的未来发展趋势，易经有何见解？",
    "{方面}遇到阻碍，易经的破解之道是什么？",
    "近期{方面}不顺，是否需要调整生活方位或环境？",
    "易经能为我的{项目}提供时机选择的建议吗？",
    "{时间}是否适合进行{行动}？"
]

# 优化详细咨询模板
detailed_templates = [
    "近期{问题}不断，易经认为这是什么征兆？",
    "{方面}有重要决策，易经的智慧能指导我吗？",
    "运势不佳，如何运用易经原理改善运势？",
    "居住环境似乎有问题，易经风水如何调整？",
    "做了{类型}的梦，易经如何解梦？",
    "计划{行动}，易经对此前景有何看法？",
    "与{人}关系紧张，易经哪一卦能指导人际和谐？",
    "身体出现{症状}，易经养生哲学有何建议？",
    "常遇小人困扰，易经有何化解方法？",
    "准备{行动}，易经对选址方位有何建议？",
    "{方面}的发展趋势如何？易经有何预测？",
    "面临{选择项}选择，易经能提供参考吗？",
    "{方面}的时机是否成熟？",
    "易经对{方面}有何特别提醒？",
    "如何运用易经增强{方面}的运势？",
    "我在{方面}的决策是否符合天道？",
    "{方面}是否会出现转机？时机在何时？",
    "易经能帮我分析{方面}的利弊得失吗？",
    "我在{方面}的做法是否恰当？",
    "易经如何评估{项目}的风险程度？",
    "{方面}的前景如何？易经有何预示？",
    "在{方面}我应该注意什么？",
    "易经对{方面}有何忠告？",
    "我{方面}的运势走向如何？",
    "易经能帮我规划{方面}的发展路径吗？",
    "我在{方面}是否受到不良影响？",
    "{方面}不顺，易经认为根本原因是什么？",
    "想要改变{方面}现状，易经建议什么方法？",
    "易经能指点我{方面}的贵人方向吗？",
    "{方面}的问题，是命运使然还是可以改变？"
]

# 优化紧急求助模板 - 减少夸张表达
emergency_templates = [
    "{方面}出现{问题}，易经有何应急指导？",
    "{方面}遇到瓶颈，哪一卦能指明方向？",
    "{人}{情况}，易经能提供什么帮助？",
    "近期{问题}困扰，易经有何化解建议？",
    "感觉能量失衡，如何用易经原理调整？",
    "计划{行动}，易经对当前时机有何看法？",
    "{方面}出现亏损，易经有何调整建议？",
    "感觉运势受阻，易经有何破解方法？",
    "{方面}选择困难，易经能提供指引吗？",
    "家庭不和睦，易经有何调和之道？",
    "{方面}出现重要问题，急需易经指导",
    "{方面}需要及时指引，易经能帮助吗？",
    "{方面}情况变化，需要易经智慧",
    "突发情况，易经有何应对建议？",
    "面临危机，易经的应对智慧是什么？",
    "{方面}突然变差，易经有何建议？",
    "{方面}遇到困难，需要易经指导",
    "{方面}情况紧急，易经能提供帮助吗？",
    "{方面}出现问题，急需解决之道",
    "{方面}需要及时处理，易经有何建议？"
]

# 优化选项词汇库 - 更加合理和专业
time_options = [
    "今年", "本月", "本周", "近期", "明年", "下个月", "这个季度", "下半年",
    "最近", "当下", "目前", "未来一个月", "未来三个月", "接下来的一周", "这段时间"
]

aspect_options = [
    "事业", "感情", "健康", "财运", "学业", "工作", "婚姻", "投资", "人际关系", 
    "家庭", "子女", "父母", "职场", "创业", "生意", "项目", "合作", "考试", "晋升",
    "事业发展", "情感关系", "身体健康", "财务状况", "学习进步", "工作表现", "婚姻生活",
    "投资收益", "人际交往", "家庭和睦", "子女教育", "赡养父母", "职业规划", "创业机会",
    "商业合作", "学术研究", "技能提升", "职位变动"
]

action_options = [
    "创业", "换工作", "投资", "买房", "搬家", "结婚", "学习", "旅行", "签约", 
    "合作", "转行", "跳槽", "谈判", "面试", "开业", "深造", "进修",
    "求职", "升职", "购房", "结婚", "出国", "考研", "考证", "学技能",
    "理财", "储蓄", "医疗", "美容"
]

phenomenon_options = [
    "失眠", "破财", "遇到阻碍", "不顺心", "焦虑", "压力大", "争执", 
    "身体不适", "计划受阻", "被人误解", "投资亏损", "工作挫折",
    "情绪低落", "心神不宁", "决策困难", "缺乏动力", "情绪波动"
]

people_options = [
    "老人", "孩子", "父母", "伴侣", "朋友", "同事", "领导", "合伙人", 
    "老师", "同学", "亲戚", "上司", "下属", "兄弟姐妹",
    "同事", "上司", "客户", "医生", "导师", "顾问"
]

event_options = [
    "考试", "面试", "手术", "签约", "比赛", "答辩", "晋升", "谈判", 
    "开业", "乔迁", "结婚", "生子", "庆生", "聚会", "出差", "旅游",
    "升职", "加薪", "获奖", "体检", "治疗", "康复"
]

project_options = [
    "新项目", "股票投资", "基金投资", "房产投资", "创业项目", "合作项目", 
    "开发项目", "理财计划", "商业计划", "学习计划", "职业规划"
]

problem_options = [
    "不顺", "争执", "健康问题", "计划受阻", "被人误解", "投资亏损", 
    "工作挫折", "关系紧张", "发展瓶颈", "选择困难", "时机不佳"
]

situation_options = [
    "健康问题", "手术", "康复期", "情况好转", "情况稳定", "需要关注",
    "重要决策", "关键时期", "转型阶段", "发展期", "调整期"
]

dream_types = [
    "奇异", "重复", "预知", "美好", "混乱", "清晰", "象征性", 
    "警示", "启发", "回忆", "未来相关"
]

symptom_options = [
    "长期不适", "亚健康", "失眠", "焦虑", "疲劳", "头晕", 
    "消化不良", "胸闷", "乏力", "食欲不振", "情绪不稳", "注意力不集中"
]

choice_options = [
    "吉日", "方位", "颜色", "发展方向", "决策方案", "解决办法", 
    "合作伙伴", "投资项目", "学习方向", "工作机会", "居住地点"
]

# 优化情感表达词 - 更加自然
emotional_expressions = [
    "颇为困扰", "有些焦虑", "比较担心", "感到迷茫", "十分期待", 
    "有些着急", "颇为纠结", "相当困难", "特别焦虑", "十分担心",
    "相当迷茫", "颇为棘手", "忧心忡忡", "忐忑不安", "心烦意乱"
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

def generate_divination_questions(templates, num_questions):
    """生成易经占卜专业问题"""
    questions = []
    
    for _ in range(num_questions):
        template = random.choice(templates)
        question = template
        
        # 替换所有占位符
        placeholders = {
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
            '{情感}': emotional_expressions
        }
        
        for placeholder, options in placeholders.items():
            if placeholder in question:
                # 避免同一问题中相同占位符使用相同选项
                if placeholder in ['{方面}', '{方面2}']:
                    used_aspects = []
                    while placeholder in question:
                        choice = random.choice([opt for opt in options if opt not in used_aspects])
                        question = question.replace(placeholder, choice, 1)
                        used_aspects.append(choice)
                else:
                    question = question.replace(placeholder, random.choice(options))
        
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
    
    # 生成各种类型的问题
    print("生成基础咨询问题...")
    basic_questions = generate_divination_questions(base_templates, 1500)
    
    print("生成详细咨询问题...")
    detailed_questions = generate_divination_questions(detailed_templates, 1200)
    
    print("生成紧急求助问题...")
    emergency_questions = generate_divination_questions(emergency_templates, 1000)
    
    print("生成专业咨询问题...")
    professional_questions = generate_professional_questions(800)
    
    print("生成复合问题...")
    complex_questions = generate_complex_questions(800)
    
    print("生成对话问题...")
    dialogue_questions = generate_dialogue_questions(800)
    
    print("生成多轮对话场景...")
    conversation_scenarios = generate_conversation_scenarios(1000)
    
    print("生成后续追问问题...")
    followup_questions = generate_followup_questions()
    
    # 合并所有问题
    all_questions = (basic_questions + detailed_questions + emergency_questions + 
                    professional_questions + complex_questions + dialogue_questions + 
                    conversation_scenarios + followup_questions)
    
    print(f"合并后共有 {len(all_questions)} 个问题")
    
    # 去重和打乱顺序
    unique_questions = list(set(all_questions))
    random.shuffle(unique_questions)
    
    print(f"去重后共有 {len(unique_questions)} 个问题")
    
    # 修复无限循环问题：设置最大迭代次数
    max_iterations = 10  # 最多尝试10次
    iteration = 0
    
    while len(unique_questions) < 10000 and iteration < max_iterations:
        iteration += 1
        needed = 10000 - len(unique_questions)
        print(f"第{iteration}次补充，需要{needed}个问题...")
        
        # 使用更多样化的模板组合
        all_templates = base_templates + detailed_templates + emergency_templates + complex_templates + professional_templates
        additional_questions = generate_divination_questions(
            all_templates, 
            min(2000, needed * 2)  # 生成多一些以便去重后能达到目标
        )
        
        # 合并并去重
        unique_questions.extend(additional_questions)
        unique_questions = list(set(unique_questions))
        print(f"补充后共有 {len(unique_questions)} 个问题")
    
    # 如果仍然不足，使用更激进的方法生成更多问题
    if len(unique_questions) < 10000:
        print("使用扩展方法生成更多问题...")
        # 生成更多对话场景
        extra_conversations = generate_conversation_scenarios(2000)
        unique_questions.extend(extra_conversations)
        unique_questions = list(set(unique_questions))
        print(f"扩展对话后共有 {len(unique_questions)} 个问题")
    
    # 最终确保达到10000个问题
    if len(unique_questions) > 10000:
        unique_questions = unique_questions[:10000]
    elif len(unique_questions) < 10000:
        print(f"警告：最终只生成了 {len(unique_questions)} 个问题，未达到10000个目标")
    
    # 保存到文件
    output_file = '../prompts/divination_questions_upgraded.txt'
    save_questions(unique_questions, output_file)
    
    print(f"\n已生成 {len(unique_questions)} 个专业易经占卜问题")
    print(f"问题已保存到: {output_file}")
    print("\n问题类型分布:")
    print(f"- 基础咨询: {len(basic_questions)}")
    print(f"- 详细咨询: {len(detailed_questions)}")
    print(f"- 紧急求助: {len(emergency_questions)}")
    print(f"- 专业咨询: {len(professional_questions)}")
    print(f"- 复合问题: {len(complex_questions)}")
    print(f"- 对话问题: {len(dialogue_questions)}")
    print(f"- 对话场景: {len(conversation_scenarios)}")
    print(f"- 后续追问: {len(followup_questions)}")

if __name__ == "__main__":
    main()