import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import json
import time
from tqdm import tqdm
import concurrent.futures
from threading import Lock
import os
import argparse
import logging
from datetime import datetime

# 确保输出目录存在
output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'output')
os.makedirs(output_dir, exist_ok=True)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(output_dir, 'xingzuo_distillation.log'), encoding='utf-8'),
        logging.StreamHandler()
    ]
)

class XingzuoDistiller:
    def __init__(self, max_workers=3, model="qwen2.5:7b", api_url="http://localhost:11434/api/generate"):
        self.api_url = api_url
        self.model = model
        self.max_workers = max_workers
        self.lock = Lock()
        self.session = requests.Session()
        # 配置重试策略
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # 增加重试次数和超时时间
        self.retry_count = 5
        self.base_delay = 2
        
        # 星座占星专业提示词
        self.system_prompt = """你是一位专业的占星大师，精通星座分析、行星相位、宫位系统等占星学知识。请用专业但易懂的语言回答以下问题，专注于星座占星领域。

回答要求：
1. 只使用星座占星学知识，不要涉及易经、八字等其他命理体系
2. 回答要专业、准确，体现占星学的深度
3. 语言要亲切自然，既有专业性又有实用性
4. 针对问题给出具体的星座分析和建议
5. 避免使用过于学术化的术语，要用通俗易懂的语言解释专业概念

请基于以上要求回答以下问题："""
    
    def generate_response(self, prompt, timeout=120):
        """生成单个回答，带重试机制"""
        # 清理占位符
        cleaned_prompt = self.clean_placeholders(prompt)
        
        data = {
            "model": self.model,
            "prompt": f"{self.system_prompt}\n\n{cleaned_prompt}",
            "stream": False,
            "options": {
                "temperature": 0.3,
                "top_p": 0.9,
                "num_predict": 512,
                "repeat_penalty": 1.1,
                "num_ctx": 2048,
                "mirostat": 0,
                "seed": 42
            }
        }
        
        # 重试机制
        for attempt in range(self.retry_count):
            try:
                response = self.session.post(self.api_url, json=data, timeout=timeout)
                response.raise_for_status()
                result = response.json()
                
                if 'response' in result:
                    response_text = result['response'].strip()
                    # 验证回答是否专注于星座占星
                    if self.validate_astrology_response(response_text):
                        return response_text
                    else:
                        logging.warning(f"回答偏离星座主题，将重试 (尝试 {attempt+1}/{self.retry_count})")
                        if attempt < self.retry_count - 1:
                            time.sleep(self.base_delay)
                        continue
                else:
                    logging.error(f"API响应格式错误: {result}")
                    return None
                    
            except requests.exceptions.Timeout:
                logging.warning(f"请求超时 (尝试 {attempt+1}/{self.retry_count}): {cleaned_prompt[:50]}...")
                if attempt < self.retry_count - 1:
                    delay = self.base_delay * (2 ** attempt)
                    logging.info(f"等待 {delay} 秒后重试...")
                    time.sleep(delay)
                continue
                
            except requests.exceptions.ConnectionError:
                logging.error(f"连接错误: 无法连接到 {self.api_url}")
                if attempt < self.retry_count - 1:
                    delay = self.base_delay * (2 ** attempt)
                    logging.info(f"等待 {delay} 秒后重试...")
                    time.sleep(delay)
                continue
                
            except requests.exceptions.RequestException as e:
                logging.error(f"请求错误 (尝试 {attempt+1}/{self.retry_count}): {e}")
                if attempt < self.retry_count - 1:
                    delay = self.base_delay * (2 ** attempt)
                    logging.info(f"等待 {delay} 秒后重试...")
                    time.sleep(delay)
                continue
                
            except json.JSONDecodeError:
                logging.error(f"JSON解析错误: 无法解析API响应")
                return None
                
            except Exception as e:
                logging.error(f"未知错误 (尝试 {attempt+1}/{self.retry_count}): {e}")
                if attempt < self.retry_count - 1:
                    delay = self.base_delay * (2 ** attempt)
                    logging.info(f"等待 {delay} 秒后重试...")
                    time.sleep(delay)
                continue
        
        logging.error(f"所有重试都失败了: {cleaned_prompt[:50]}...")
        return None

    def clean_placeholders(self, prompt):
        """清理未替换的占位符"""
        import re
        # 常见的占位符模式
        placeholder_patterns = [
            r'\{[^{}]+\}',  # {占位符}
            r'\[[^\[\]]+\]'  # [占位符]
        ]
        
        cleaned_prompt = prompt
        for pattern in placeholder_patterns:
            matches = re.findall(pattern, cleaned_prompt)
            for match in matches:
                # 用合适的词汇替换占位符
                replacement = self.get_replacement_for_placeholder(match)
                cleaned_prompt = cleaned_prompt.replace(match, replacement)
        
        return cleaned_prompt

    def get_replacement_for_placeholder(self, placeholder):
        """为占位符提供合适的替换词"""
        replacement_map = {
            # 星座相关
            '{星座名称}': '白羊座', '{特定星座}': '金牛座', '{星座组合}': '太阳白羊月亮金牛',
            '{核心特质}': '勇敢冲动', '{星座元素}': '火象元素', '{星座宫位}': '第一宫',
            '{太阳月亮上升}': '太阳星座、月亮星座和上升星座', '{星座比喻}': '勇猛的战士',
            '{星座症状}': '冲动倾向', '{星座含义}': '领导特质',
            
            # 占星概念
            '{星象显示}': '金星进入白羊座', '{特定星象}': '水星逆行', '{当前星象}': '木星进入射手座',
            '{行星相位}': '金星与火星形成三分相', '{相位微妙}': '行星间的和谐相位',
            '{核心概念}': '星座能量', '{占星概念}': '行星影响力',
            
            # 问题场景
            '{具体情境}': '职业发展', '{现实问题}': '感情关系', '{复杂问题}': '人生重大决策',
            '{咨询领域}': '个人成长', '{组织现状}': '团队协作', '{个人困境}': '职业瓶颈',
            '{长期目标}': '事业成功', '{行业周期}': '发展机遇期',
            
            # 实践指导
            '{实践指导}': '行动建议', '{应对策略}': '调整方案', '{调理方案}': '改善计划',
            '{操作框架}': '实施步骤', '{实施要点}': '关键环节', '{方法论体系}': '系统方法',
            '{决策模型}': '分析框架', '{战略意义}': '长远价值',
            
            # 其他
            '{多维角度}': '多维度', '{专业体系}': '专业理论', '{诊断技术}': '分析方法',
            '{理论方法}': '专业方法', '{修养之道}': '成长路径', '{历史案例}': '经典案例',
            '{知名企业}': '成功企业', '{转型案例}': '转型经验', '{古代智者}': '历史智者',
            '{成功方略}': '成功策略', '{理论争议}': '学术讨论', '{不同流派}': '不同学派',
            '{方法论}': '分析方法', '{具体应用}': '实际应用', '{操作细节}': '具体步骤',
            '{理解疑点}': '困惑之处', '{精微义理}': '深层原理', '{实践过程}': '实施过程',
            '{新问题}': '新挑战', '{调整策略}': '优化方案', '{达成目标}': '实现目标',
            '{理论观点}': '学术观点', '{其他流派}': '其他学派', '{不同见解}': '不同看法',
            '{融会贯通}': '整合应用', '{创新领域}': '新领域', '{关键要点}': '核心要点',
            '{注意事项}': '重要提醒', '{经验教训}': '经验总结', '{具体启示}': '实际启发',
            '{修行方法}': '提升方法', '{现代环境}': '当代背景', '{灵活运用}': '变通应用',
            '{保持效果}': '持续有效', '{系统评估}': '全面分析', '{资源配置}': '资源分配',
            '{时机选择}': '时机把握', '{决策模型}': '决策框架'
        }
        
        return replacement_map.get(placeholder, '相关领域')

    def validate_astrology_response(self, response):
        """验证回答是否专注于星座占星"""
        astrology_keywords = [
            '星座', '行星', '宫位', '相位', '星盘', '白羊', '金牛', '双子', '巨蟹',
            '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼',
            '太阳', '月亮', '上升', '金星', '火星', '木星', '土星', '天王', '海王', '冥王',
            '占星', '星象', '黄道', '本命', '行运', '合盘', '推运'
        ]
        
        other_topics_keywords = [
            '易经', '周易', '卦象', '爻辞', '阴阳', '五行', '八字', '命理',
            '紫微', '奇门', '六爻', '风水', '面相', '手相'
        ]
        
        # 检查是否包含星座占星关键词
        has_astrology = any(keyword in response for keyword in astrology_keywords)
        # 检查是否包含其他主题关键词
        has_other_topics = any(keyword in response for keyword in other_topics_keywords)
        
        # 如果有星座内容且没有其他主题内容，则认为合格
        return has_astrology and not has_other_topics

    def process_single_prompt(self, prompt_data):
        """处理单个提示"""
        prompt, output_file, index, total, failed_file = prompt_data
        
        logging.info(f"处理进度: {index+1}/{total}")
        logging.info(f"问题: {prompt}")
        
        response = self.generate_response(prompt, timeout=90)
        
        if response:
            result = {
                "instruction": prompt,
                "input": "",
                "output": response.strip(),
                "metadata": {
                    "model": self.model,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "topic": "星座占星"
                }
            }
            
            # 线程安全地写入文件
            try:
                with self.lock:
                    with open(output_file, 'a', encoding='utf-8') as f:
                        f.write(json.dumps(result, ensure_ascii=False) + '\n')
                
                logging.info(f"生成成功，长度: {len(response)} 字符")
                logging.info(f"回答预览: {response[:100]}...")
                return True
            except Exception as e:
                logging.error(f"写入文件时出错: {e}")
                return False
        else:
            # 记录失败的问题
            try:
                with self.lock:
                    with open(failed_file, 'a', encoding='utf-8') as f:
                        f.write(prompt + '\n')
                logging.warning(f"生成失败，已记录到失败文件: {prompt}")
            except Exception as e:
                logging.error(f"记录失败问题时出错: {e}")
            return False

    def count_processed_prompts(self, output_file):
        """计算已处理的提示数量"""
        if os.path.exists(output_file):
            try:
                with open(output_file, 'r', encoding='utf-8') as f:
                    return sum(1 for line in f if line.strip())
            except Exception as e:
                logging.error(f"读取输出文件时出错: {e}")
                return 0
        return 0

    def load_failed_prompts(self, failed_file):
        """加载失败的提示"""
        if os.path.exists(failed_file):
            try:
                with open(failed_file, 'r', encoding='utf-8') as f:
                    return [line.strip() for line in f if line.strip()]
            except Exception as e:
                logging.error(f"读取失败文件时出错: {e}")
                return []
        return []

    def process_batch_parallel(self, input_file, output_file, resume=True, retry_failed=False):
        """并行批量处理所有问题"""
        # 确保输出目录存在
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        # 失败文件路径
        failed_file = output_file.replace('.jsonl', '_failed.txt')
        
        # 读取所有提示
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                all_prompts = [line.strip() for line in f if line.strip()]
        except Exception as e:
            logging.error(f"读取输入文件时出错: {e}")
            return 0, 0
        
        total_prompts = len(all_prompts)
        logging.info(f"总共找到 {total_prompts} 个问题")
        
        # 如果启用重试失败的问题
        if retry_failed and os.path.exists(failed_file):
            failed_prompts = self.load_failed_prompts(failed_file)
            if failed_prompts:
                logging.info(f"发现 {len(failed_prompts)} 个失败的问题，将优先处理")
                # 将失败的问题添加到待处理列表的前面
                all_prompts = failed_prompts + [p for p in all_prompts if p not in failed_prompts]
                total_prompts = len(all_prompts)
                logging.info(f"更新后总共需要处理 {total_prompts} 个问题")
                # 清空失败文件
                open(failed_file, 'w').close()
        
        # 计算已处理的数量
        processed_count = 0
        if resume and os.path.exists(output_file):
            processed_count = self.count_processed_prompts(output_file)
            logging.info(f"发现已处理 {processed_count} 个问题")
        
        if processed_count >= total_prompts:
            logging.info("所有问题都已处理完成！")
            return 0, 0
        
        # 准备待处理的数据
        remaining_prompts = all_prompts[processed_count:]
        prompt_data = [(prompt, output_file, processed_count+i, total_prompts, failed_file) 
                      for i, prompt in enumerate(remaining_prompts)]
        
        logging.info(f"开始并行处理 {len(prompt_data)} 个问题，使用 {self.max_workers} 个线程")
        
        success_count = 0
        failed_count = 0
        
        # 使用线程池并行处理
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # 提交所有任务
            future_to_index = {executor.submit(self.process_single_prompt, data): data[2] 
                             for data in prompt_data}
            
            # 处理完成的任务
            for future in tqdm(concurrent.futures.as_completed(future_to_index), 
                             total=len(prompt_data), desc="处理星座问题"):
                try:
                    success = future.result()
                    if success:
                        success_count += 1
                    else:
                        failed_count += 1
                except Exception as e:
                    logging.error(f"处理任务时出错: {e}")
                    failed_count += 1
        
        # 统计最终结果
        final_processed = self.count_processed_prompts(output_file)
        final_failed = 0
        if os.path.exists(failed_file):
            final_failed = len(self.load_failed_prompts(failed_file))
        
        logging.info(f"\n处理完成:")
        logging.info(f"- 成功: {success_count}")
        logging.info(f"- 失败: {failed_count}")
        logging.info(f"- 总计: {success_count + failed_count}")
        logging.info(f"- 输出文件中实际记录: {final_processed}")
        logging.info(f"- 失败文件中记录: {final_failed}")
        
        return success_count, failed_count

def main():
    """主函数"""
    # 获取项目根目录
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    parser = argparse.ArgumentParser(description='星座数据蒸馏工具 - 专业版')
    parser.add_argument('--input', '-i', default=os.path.join(project_root, 'prompts', 'astrology_questions_20251012_021909.txt'),
                       help='输入文件路径')
    parser.add_argument('--output', '-o', default=os.path.join(project_root, 'output', 'xingzuo_distilled22.jsonl'),
                       help='输出文件路径')
    parser.add_argument('--workers', '-w', type=int, default=2,
                       help='并行工作线程数')
    parser.add_argument('--model', '-m', default='qwen2.5:7b',
                       help='使用的模型名称')
    parser.add_argument('--api-url', '-u', default='http://localhost:11434/api/generate',
                       help='Ollama API地址')
    parser.add_argument('--no-resume', action='store_true',
                       help='不从上次中断处继续处理')
    parser.add_argument('--retry-failed', action='store_true',
                       help='优先处理之前失败的问题')
    parser.add_argument('--timeout', '-t', type=int, default=120,
                       help='API请求超时时间（秒）')
    
    args = parser.parse_args()
    
    logging.info("星座数据蒸馏工具 - 专业版")
    logging.info(f"输入文件: {args.input}")
    logging.info(f"输出文件: {args.output}")
    logging.info(f"并行线程数: {args.workers}")
    logging.info(f"使用模型: {args.model}")
    logging.info(f"API地址: {args.api_url}")
    logging.info(f"恢复模式: {'关闭' if args.no_resume else '开启'}")
    logging.info(f"重试失败问题: {'开启' if args.retry_failed else '关闭'}")
    logging.info(f"请求超时: {args.timeout} 秒")
    
    # 创建蒸馏器实例
    distiller = XingzuoDistiller(
        max_workers=args.workers,
        model=args.model,
        api_url=args.api_url
    )
    
    # 开始处理
    try:
        success, failed = distiller.process_batch_parallel(
            args.input, 
            args.output, 
            resume=not args.no_resume,
            retry_failed=args.retry_failed
        )
        
        logging.info(f"\n星座数据蒸馏完成!")
        logging.info(f"成功处理: {success} 个问题")
        logging.info(f"失败处理: {failed} 个问题")
        logging.info(f"输出文件: {args.output}")
        
    except KeyboardInterrupt:
        logging.info("用户中断了程序执行")
    except Exception as e:
        logging.error(f"程序执行出错: {e}")

if __name__ == "__main__":
    main()