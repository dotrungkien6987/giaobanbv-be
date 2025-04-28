// Tạo tài liệu schema cho các bảng trong PostgreSQL
const fs = require('fs');
const path = require('path');
const pool = require('../config/dbConfig');

// Danh sách các bảng cần tạo tài liệu
const tables = ['department', 'departmentgroup'];

// Hàm lấy thông tin cột của bảng
async function getTableColumns(tableName) {
  try {
    const query = `
      SELECT 
        c.column_name, 
        c.data_type, 
        c.character_maximum_length,
        c.column_default, 
        c.is_nullable, 
        CASE WHEN pk.constraint_type = 'PRIMARY KEY' THEN 'TRUE' ELSE 'FALSE' END AS is_primary_key
      FROM 
        information_schema.columns c
      LEFT JOIN (
        SELECT 
          ku.table_name,
          ku.column_name,
          tc.constraint_type
        FROM 
          information_schema.table_constraints tc
        JOIN 
          information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE 
          tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
      WHERE 
        c.table_name = $1
      ORDER BY 
        c.ordinal_position;
    `;

    const { rows } = await pool.query(query, [tableName]);
    return rows;
  } catch (error) {
    console.error(`Lỗi khi lấy thông tin cột của bảng ${tableName}:`, error);
    return [];
  }
}

// Hàm lấy thông tin khóa ngoại của bảng
async function getForeignKeys(tableName) {
  try {
    const query = `
      SELECT
        ccu.column_name AS column_name,
        ccu2.table_name AS referenced_table,
        ccu2.column_name AS referenced_column
      FROM 
        information_schema.table_constraints tc
      JOIN 
        information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      JOIN 
        information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
      JOIN 
        information_schema.constraint_column_usage ccu2 ON rc.unique_constraint_name = ccu2.constraint_name
      WHERE 
        tc.constraint_type = 'FOREIGN KEY' AND
        tc.table_name = $1;
    `;

    const { rows } = await pool.query(query, [tableName]);
    return rows;
  } catch (error) {
    console.error(`Lỗi khi lấy thông tin khóa ngoại của bảng ${tableName}:`, error);
    return [];
  }
}

// Hàm tạo file tài liệu schema markdown
async function generateSchemaDocForTable(tableName) {
  try {
    const columns = await getTableColumns(tableName);
    const foreignKeys = await getForeignKeys(tableName);

    if (columns.length === 0) {
      console.log(`Không tìm thấy thông tin cho bảng ${tableName}. Tạo file mẫu...`);
      
      // Tạo file mẫu cho trường hợp không tìm thấy thông tin từ DB
      let markdown = `# Bảng \`${tableName}\`\n\n`;
      markdown += `## Mô tả\n\n`;
      markdown += `Bảng \`${tableName}\` lưu trữ thông tin về [mô tả mục đích của bảng].\n\n`;
      markdown += `## Cấu trúc bảng\n\n`;
      
      markdown += `| Tên cột | Kiểu dữ liệu | Cho phép NULL | Giá trị mặc định | Khóa chính | Mô tả |\n`;
      markdown += `|---------|-------------|---------------|------------------|------------|---------|\n`;
      markdown += `| [tên cột] | [kiểu dữ liệu] | [có/không] | [giá trị mặc định] | [có/không] | [mô tả] |\n`;
      
      markdown += `\n## Khóa ngoại\n\n`;
      markdown += `| Tên cột | Tham chiếu đến bảng | Tham chiếu đến cột |\n`;
      markdown += `|---------|---------------------|--------------------|\n`;
      markdown += `| [tên cột] | [tên bảng tham chiếu] | [tên cột tham chiếu] |\n`;
      
      markdown += `\n## Các chỉ mục\n\n`;
      markdown += `[Thông tin về các chỉ mục trên bảng nếu có]\n\n`;
      
      markdown += `## Ví dụ dữ liệu\n\n`;
      markdown += `[Ví dụ về dữ liệu trong bảng]\n\n`;
      
      markdown += `## Ghi chú\n\n`;
      markdown += `[Các ghi chú bổ sung về bảng]\n`;
      
      const outputPath = path.join(__dirname, 'schema_docs', `${tableName}.md`);
      fs.writeFileSync(outputPath, markdown);
      console.log(`Đã tạo file mẫu cho bảng ${tableName}`);
      return;
    }

    let markdown = `# Bảng \`${tableName}\`\n\n`;
    markdown += `## Mô tả\n\n`;
    markdown += `Bảng \`${tableName}\` lưu trữ thông tin về [mô tả mục đích của bảng].\n\n`;
    markdown += `## Cấu trúc bảng\n\n`;
    
    markdown += `| Tên cột | Kiểu dữ liệu | Cho phép NULL | Giá trị mặc định | Khóa chính | Mô tả |\n`;
    markdown += `|---------|-------------|---------------|------------------|------------|---------|\n`;
    
    for (const col of columns) {
      let dataType = col.data_type;
      if (col.character_maximum_length) {
        dataType += `(${col.character_maximum_length})`;
      }
      const isNullable = col.is_nullable === 'YES' ? 'Có' : 'Không';
      const isPrimaryKey = col.is_primary_key === 'TRUE' ? 'Có' : 'Không';
      const defaultValue = col.column_default || '';
      
      markdown += `| ${col.column_name} | ${dataType} | ${isNullable} | ${defaultValue} | ${isPrimaryKey} | |\n`;
    }
    
    if (foreignKeys.length > 0) {
      markdown += `\n## Khóa ngoại\n\n`;
      markdown += `| Tên cột | Tham chiếu đến bảng | Tham chiếu đến cột |\n`;
      markdown += `|---------|---------------------|--------------------|\n`;
      
      for (const fk of foreignKeys) {
        markdown += `| ${fk.column_name} | ${fk.referenced_table} | ${fk.referenced_column} |\n`;
      }
    }
    
    markdown += `\n## Các chỉ mục\n\n`;
    markdown += `[Thông tin về các chỉ mục trên bảng nếu có]\n\n`;
    
    markdown += `## Ví dụ dữ liệu\n\n`;
    markdown += `[Ví dụ về dữ liệu trong bảng]\n\n`;
    
    markdown += `## Ghi chú\n\n`;
    markdown += `[Các ghi chú bổ sung về bảng]\n`;
    
    const outputPath = path.join(__dirname, 'schema_docs', `${tableName}.md`);
    fs.writeFileSync(outputPath, markdown);
    console.log(`Đã tạo file tài liệu cho bảng ${tableName}`);
  } catch (error) {
    console.error(`Lỗi khi tạo tài liệu cho bảng ${tableName}:`, error);
  }
}

// Hàm chính để tạo tài liệu cho tất cả các bảng
async function generateAllSchemaDocs() {
  try {
    console.log('Bắt đầu tạo tài liệu schema...');
    
    for (const table of tables) {
      await generateSchemaDocForTable(table);
    }
    
    console.log('Hoàn thành việc tạo tài liệu schema!');
  } catch (error) {
    console.error('Lỗi khi tạo tài liệu schema:', error);
  } finally {
    // Đóng kết nối pool sau khi hoàn thành
    pool.end();
  }
}

// Chạy hàm chính
generateAllSchemaDocs();