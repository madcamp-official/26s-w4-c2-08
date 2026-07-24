// 테스트용 스크립트. 실제 groupId 계산은 extension.ts가 담당 (서버는 재계산 안 함).
// 사용: node scripts/group-id.js https://github.com/org/repo.git
const crypto = require('crypto');

function hashGroupId(repoUrl) {
  return crypto.createHash('sha256').update(repoUrl).digest('hex').slice(0, 12);
}

if (require.main === module) {
  const repoUrl = process.argv[2];
  console.log(hashGroupId(repoUrl));
}

module.exports = hashGroupId;
