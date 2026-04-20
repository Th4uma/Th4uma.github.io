import os


def lowercase_extensions(folder_path):
    # 检查文件夹是否存在
    if not os.path.isdir(folder_path):
        print(f"错误: 找不到文件夹 '{folder_path}'")
        return

    count = 0
    # 遍历文件夹
    for filename in os.listdir(folder_path):
        # 获取文件名和当前后缀
        name, ext = os.path.splitext(filename)

        # 如果后缀中有大写字母
        if ext != ext.lower():
            new_filename = name + ext.lower()

            # 构建完整的绝对路径
            old_path = os.path.join(folder_path, filename)
            new_path = os.path.join(folder_path, new_filename)

            # 执行重命名
            try:
                os.rename(old_path, new_path)
                print(f"已重命名: {filename} -> {new_filename}")
                count += 1
            except OSError as e:
                print(f"重命名 {filename} 失败: {e}")

    print(f"\n处理完成！共修改了 {count} 个文件。")


# --- 使用方法 ---
# 将下面的路径替换为你存放照片的实际文件夹路径
target_folder = r'D:\Software\hugo\blog\static\images\urbex'
lowercase_extensions(target_folder)