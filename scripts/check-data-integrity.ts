import { runDataIntegrityAudit, repairDataIntegrity } from '../server/integrityChecker';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m\x1b[30m',
  bgRed: '\x1b[41m\x1b[37m',
  bgYellow: '\x1b[43m\x1b[30m',
};

async function main() {
  const args = process.argv.slice(2);
  const shouldRepair = args.includes('--fix') || args.includes('--repair');

  console.log('\n' + colors.bright + colors.cyan + '='.repeat(78) + colors.reset);
  console.log(
    colors.bright +
      colors.cyan +
      '  🔍 BỘ KIỂM TRA TÍNH TOÀN VẸN CƠ SỞ DỮ LIỆU ĐA TẦNG (DATA INTEGRITY AUDIT)' +
      colors.reset
  );
  console.log(
    colors.dim + '  Kiểm tra đối soát: RAM Máy chủ ↔ File Ổ đĩa (db.json) ↔ Google Cloud Firestore' + colors.reset
  );
  console.log(colors.cyan + '='.repeat(78) + colors.reset + '\n');

  console.log(colors.dim + '⏳ Đang quét và phân tích dữ liệu trên các tầng lưu trữ...' + colors.reset);

  const report = await runDataIntegrityAudit();

  console.log('\n' + colors.bright + '📊 BẢNG ĐỐI SOÁT CHI TIẾT TỪNG PHÂN HỆ:' + colors.reset);
  console.log('-'.repeat(82));
  console.log(
    colors.bright +
      `${'Phân hệ / Collection'.padEnd(30)} | ${'RAM'.padEnd(6)} | ${'Disk'.padEnd(6)} | ${'Cloud'.padEnd(6)} | ${'Backup'.padEnd(6)} | ${'Trạng thái'}` +
      colors.reset
  );
  console.log('-'.repeat(82));

  for (const [key, col] of Object.entries(report.collections)) {
    let statusBadge = colors.green + '✔ TOÀN VẸN' + colors.reset;
    if (col.status === 'WARNING') {
      statusBadge = colors.yellow + '▲ CẢNH BÁO' + colors.reset;
    } else if (col.status === 'CRITICAL') {
      statusBadge = colors.red + '✖ THẤT LẠC' + colors.reset;
    }

    const row = `${col.name.padEnd(30)} | ${String(col.memoryCount).padEnd(6)} | ${String(col.diskCount).padEnd(6)} | ${String(col.cloudCount).padEnd(6)} | ${String(col.backupCount).padEnd(6)} | ${statusBadge}`;
    console.log(row);
  }
  console.log('-'.repeat(82));

  // Check detailed issues
  let hasIssues = false;
  console.log('\n' + colors.bright + '🔬 CHI TIẾT KIỂM TOÁN CHUYÊN SÂU:' + colors.reset);

  for (const [key, col] of Object.entries(report.collections)) {
    const issues: string[] = [];
    if (col.duplicates.length > 0) {
      issues.push(`Trùng lặp: ${col.duplicates.join(', ')}`);
    }
    if (col.missingFields.length > 0) {
      issues.push(
        `Thiếu trường bắt buộc: ${col.missingFields.map((f) => `[${f.code || f.id}]: ${f.field}`).join(', ')}`
      );
    }
    if (col.brokenReferences.length > 0) {
      issues.push(
        `Liên kết mồ côi: ${col.brokenReferences.map((r) => `[${r.code || r.id}]: ${r.detail}`).join(', ')}`
      );
    }
    if (col.timelineWarnings.length > 0) {
      issues.push(
        `Cảnh báo thời gian: ${col.timelineWarnings.map((t) => `[${t.code || t.id}]: ${t.issue}`).join(', ')}`
      );
    }
    if (col.memoryCount !== col.diskCount || (col.cloudCount > 0 && col.memoryCount !== col.cloudCount)) {
      issues.push(`Lệch đồng bộ: RAM=${col.memoryCount}, Disk=${col.diskCount}, Cloud=${col.cloudCount}`);
    }

    if (issues.length > 0) {
      hasIssues = true;
      console.log(`\n  ${colors.yellow}⚠️  [${col.name}]${colors.reset}`);
      issues.forEach((iss) => console.log(`     - ${iss}`));
    }
  }

  if (!hasIssues) {
    console.log(
      `  ${colors.green}✔ Không phát hiện bất kỳ bản ghi nào bị thất lạc, trùng lặp hay gãy liên kết!${colors.reset}`
    );
  }

  // Summary
  console.log('\n' + colors.bright + '🎯 KẾT LUẬN TOÀN CỤC:' + colors.reset);
  console.log(
    `  • Tổng số phân hệ kiểm tra: ${colors.bright}${report.summary.totalCollections}${colors.reset}`
  );
  console.log(
    `  • Phân hệ hoàn hảo: ${colors.green}${report.summary.healthyCount}/${report.summary.totalCollections}${colors.reset}`
  );
  console.log(
    `  • Phân hệ có cảnh báo: ${report.summary.warningCount > 0 ? colors.yellow : colors.dim}${report.summary.warningCount}${colors.reset}`
  );
  console.log(
    `  • Phân hệ mất mát (Critical): ${report.summary.criticalCount > 0 ? colors.red : colors.dim}${report.summary.criticalCount}${colors.reset}`
  );
  console.log(
    `  • Tổng số bản ghi trong RAM máy chủ: ${colors.bright}${report.summary.totalRecordsInMemory}${colors.reset}`
  );
  console.log(
    `  • Tổng số bản ghi trên Google Cloud Firestore: ${colors.bright}${report.summary.totalRecordsInCloud}${colors.reset}`
  );

  let finalBadge = `${colors.bgGreen}  HỆ THỐNG AN TOÀN - DỮ LIỆU ĐỒNG NHẤT 100%  ${colors.reset}`;
  if (report.overallStatus === 'WARNING') {
    finalBadge = `${colors.bgYellow}  CẢNH BÁO - CÓ CHÊNH LỆCH NHẸ CẦN ĐỒNG BỘ  ${colors.reset}`;
  } else if (report.overallStatus === 'CRITICAL') {
    finalBadge = `${colors.bgRed}  NGUY CƠ - PHÁT HIỆN MẤT BẢN GHI SO VỚI BACKUP  ${colors.reset}`;
  }
  console.log('\n' + finalBadge + '\n');

  if (shouldRepair) {
    console.log(colors.cyan + '🔧 Đang kích hoạt chế độ tự động đồng bộ & sửa chữa (Repair mode)...' + colors.reset);
    const repairResult = await repairDataIntegrity();
    console.log(
      repairResult.success
        ? colors.green + '✔ ' + repairResult.message + colors.reset
        : colors.yellow + '▲ ' + repairResult.message + colors.reset
    );
  } else if (report.overallStatus !== 'HEALTHY') {
    console.log(
      colors.dim + '💡 Mẹo: Chạy lại lệnh với tham số --fix để tự động đồng bộ hóa: npx tsx scripts/check-data-integrity.ts --fix' + colors.reset
    );
  }

  process.exit(report.overallStatus === 'CRITICAL' ? 1 : 0);
}

main().catch((err) => {
  console.error(colors.red + 'Lỗi thực thi kiểm tra tính toàn vẹn:', err);
  process.exit(1);
});
