import os
import re

# Vietnamese character range in Unicode
# Covers àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ and uppercase
VN_REGEX = re.compile(r'[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]')

EXTENSIONS = {'.tsx', '.ts', '.md', '.html', '.json', '.sql'}
EXCLUDE_DIRS = {'node_modules', '.git', 'dist', 'build'}

def scan_files(root_dir):
    results = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Skip excluded directories
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        
        for filename in filenames:
            ext = os.path.splitext(filename)[1]
            if ext in EXTENSIONS:
                filepath = os.path.join(dirpath, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        for i, line in enumerate(f, 1):
                            if VN_REGEX.search(line):
                                results.append({
                                    'file': filepath,
                                    'line': i,
                                    'content': line.strip()
                                })
                except Exception as e:
                    # Skip binary or unreadable files
                    pass
    return results

if __name__ == "__main__":
    base_dir = "/Users/tonypham/MEGA/WebApp/pbl-asset-tools/app/orchable"
    findings = scan_files(base_dir)
    
    print(f"Found {len(findings)} lines with Vietnamese characters.\n")
    
    # Group by file for better readability
    grouped = {}
    for item in findings:
        if item['file'] not in grouped:
            grouped[item['file']] = []
        grouped[item['file']].append(item)
    
    for file, items in grouped.items():
        print(f"FILE: {file}")
        for item in items:
            print(f"  [{item['line']}]: {item['content']}")
        print("-" * 40)
