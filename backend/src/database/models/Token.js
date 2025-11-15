// Token模型
const db = require('../connection');

class Token {
    // 保存Token
    static save(token) {
        return new Promise((resolve, reject) => {
            // 先删除旧Token
            db.run('DELETE FROM api_tokens', (err) => {
                if (err) {
                    return reject(err);
                }

                // 插入新Token
                db.run(
                    'INSERT INTO api_tokens (token, provider) VALUES (?, ?)',
                    [token, 'zhipu'],
                    function(err) {
                        if (err) {
                            return reject(err);
                        }
                        resolve({ id: this.lastID, token, provider: 'zhipu' });
                    }
                );
            });
        });
    }

    // 获取Token
    static get() {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM api_tokens ORDER BY id DESC LIMIT 1',
                (err, row) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(row || null);
                }
            );
        });
    }

    // 删除Token
    static delete() {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM api_tokens', (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
}

module.exports = Token;
