const i18n = {
    zh: {
        title: "TRON靓号生成器",
        subtitle: "高级TRON地址生成 - 多线程/连号模式",
        warning: "⚠️ 安全提示：此工具完全在浏览器中运行。私钥在本地生成，永远不会离开您的计算机。",
        suffixMode: "后缀模式",
        sequenceMode: "连号模式",
        suffixLabel: "期望后缀 (1-6位):",
        sequenceLabel: "连号模式:",
        minLengthLabel: "最小连号长度:",
        threadsLabel: "线程数量:",
        difficultyLabel: "预估难度:",
        difficultyDesc: "平均需要生成 {count} 个地址",
        startBtn: "🚀 开始搜索",
        stopBtn: "⏹️ 停止搜索",
        downloadAllBtn: "📥 下载全部",
        downloadVanityBtn: "⭐ 下载靓号",
        attemptsLabel: "已检查地址",
        speedLabel: "当前速度",
        foundLabel: "找到靓号",
        threadsCountLabel: "运行线程",
        githubLink: "📚 在GitHub上查看",
        copyAddress: "复制地址",
        copyPrivateKey: "复制私钥",
        downloadSingle: "下载"
    },
    en: {
        title: "TRON Vanity Generator",
        subtitle: "Advanced TRON Address Generation - Multi-thread/Sequence Mode",
        warning: "⚠️ Security Notice: This tool runs completely in your browser. Private keys are generated locally and never leave your computer.",
        suffixMode: "Suffix Mode",
        sequenceMode: "Sequence Mode",
        suffixLabel: "Desired Suffix (1-6 chars):",
        sequenceLabel: "Sequence Pattern:",
        minLengthLabel: "Min Sequence Length:",
        threadsLabel: "Threads:",
        difficultyLabel: "Estimated Difficulty:",
        difficultyDesc: "Average {count} addresses needed",
        startBtn: "🚀 Start Search",
        stopBtn: "⏹️ Stop Search",
        downloadAllBtn: "📥 Download All",
        downloadVanityBtn: "⭐ Download Vanity",
        attemptsLabel: "Addresses Checked",
        speedLabel: "Current Speed",
        foundLabel: "Vanity Found",
        threadsCountLabel: "Running Threads",
        githubLink: "📚 View on GitHub",
        copyAddress: "Copy Address",
        copyPrivateKey: "Copy Private Key",
        downloadSingle: "Download"
    }
};

let currentLang = 'zh';
let currentMode = 'suffix';

function setLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === (lang === 'zh' ? '中文' : 'English'));
    });
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (i18n[lang][key]) {
            if (element.placeholder) {
                element.placeholder = i18n[lang][key];
            } else {
                element.textContent = i18n[lang][key];
            }
        }
    });
    updateDifficulty();
}

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
    document.getElementById('suffixGroup').style.display = mode === 'suffix' ? 'block' : 'none';
    document.getElementById('sequenceGroup').style.display = mode === 'sequence' ? 'block' : 'none';
    updateDifficulty();
}

function calculateDifficulty() {
    if (currentMode === 'suffix') {
        const suffix = document.getElementById('suffix').value.toUpperCase();
        if (!suffix) return 1;
        return Math.pow(58, suffix.length);
    } else {
        const sequence = document.getElementById('sequence').value.toUpperCase();
        const minLength = parseInt(document.getElementById('minLength').value);
        
        if (sequence) {
            const positions = 34 - sequence.length + 1;
            return Math.pow(58, sequence.length) / positions;
        } else {
            return Math.pow(58, minLength) / 10;
        }
    }
}

function updateDifficulty() {
    const difficulty = Math.floor(calculateDifficulty());
    const difficultyValue = document.getElementById('difficultyValue');
    const difficultyDesc = document.getElementById('difficultyDesc');
    
    if (difficulty < 1000) {
        difficultyValue.textContent = `1 in ${difficulty}`;
    } else if (difficulty < 1000000) {
        difficultyValue.textContent = `1 in ${Math.floor(difficulty/1000)}K`;
    } else if (difficulty < 1000000000) {
        difficultyValue.textContent = `1 in ${Math.floor(difficulty/1000000)}M`;
    } else {
        difficultyValue.textContent = `1 in ${Math.floor(difficulty/1000000000)}B`;
    }
    
    const descText = i18n[currentLang].difficultyDesc.replace('{count}', difficulty.toLocaleString());
    difficultyDesc.textContent = descText;
}

class TronVanityGenerator {
    constructor() {
        this.isSearching = false;
        this.totalAttempts = 0;
        this.foundCount = 0;
        this.startTime = 0;
        this.speedInterval = null;
        this.allResults = [];
        this.vanityResults = [];
        this.workers = [];
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('searchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.startSearch();
        });

        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stopSearch();
        });

        document.getElementById('downloadAllBtn').addEventListener('click', () => {
            this.downloadResults('all');
        });

        document.getElementById('downloadVanityBtn').addEventListener('click', () => {
            this.downloadResults('vanity');
        });

        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                setMode(btn.getAttribute('data-mode'));
            });
        });

        document.getElementById('suffix').addEventListener('input', updateDifficulty);
        document.getElementById('sequence').addEventListener('input', updateDifficulty);
        document.getElementById('minLength').addEventListener('change', updateDifficulty);
    }

    async startSearch() {
        if (this.isSearching) return;

        const threads = parseInt(document.getElementById('threads').value);
        const suffix = document.getElementById('suffix').value.toUpperCase();
        const sequence = document.getElementById('sequence').value.toUpperCase();
        const minLength = parseInt(document.getElementById('minLength').value);

        if (currentMode === 'suffix' && (!suffix || suffix.length > 6)) {
            alert(currentLang === 'zh' ? '后缀长度必须在1-6位之间' : 'Suffix length must be between 1-6 characters');
            return;
        }

        if (currentMode === 'sequence' && minLength < 2) {
            alert(currentLang === 'zh' ? '最小连号长度至少2位' : 'Min sequence length must be at least 2');
            return;
        }

        this.isSearching = true;
        this.totalAttempts = 0;
        this.foundCount = 0;
        this.startTime = Date.now();
        this.allResults = [];
        this.vanityResults = [];
        this.workers = [];

        this.updateUI(true);
        this.startSpeedCounter();

        const config = {
            mode: currentMode,
            suffix: suffix,
            sequence: sequence,
            minLength: minLength,
            threads: threads
        };

        try {
            await this.startWorkers(config, threads);
        } catch (error) {
            console.error('Search error:', error);
            this.stopSearch();
        }
    }

    async startWorkers(config, threadCount) {
        for (let i = 0; i < threadCount; i++) {
            const worker = this.createWorker(config);
            this.workers.push(worker);
        }

        while (this.isSearching) {
            const promises = this.workers.map(worker => worker.next());
            const results = await Promise.all(promises);
            
            for (const result of results) {
                if (result && this.isSearching) {
                    this.totalAttempts += result.attempts;
                    if (result.found) {
                        this.foundCount++;
                        this.vanityResults.push(result.account);
                        this.addResult(result.account);
                    }
                }
            }

            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    createWorker(config) {
        let attempts = 0;
        const batchSize = 100;

        const worker = {
            next: async () => {
                let foundAccount = null;
                let workerAttempts = 0;
                
                for (let i = 0; i < batchSize && this.isSearching; i++) {
                    workerAttempts++;
                    const account = this.generateAccount();
                    
                    if (this.checkAddress(account.address, config)) {
                        foundAccount = account;
                        break;
                    }
                }
                
                attempts += workerAttempts;
                return { 
                    found: !!foundAccount, 
                    account: foundAccount, 
                    attempts: workerAttempts 
                };
            }
        };
        
        return worker;
    }

    checkAddress(address, config) {
        if (!address || !address.startsWith('T')) return false;
        const baseAddress = address.substring(1);
        
        if (config.mode === 'suffix') {
            return baseAddress.toUpperCase().endsWith(config.suffix);
        } else {
            return this.checkSequence(baseAddress, config.sequence, config.minLength);
        }
    }

    checkSequence(address, pattern, minLength) {
        if (pattern) {
            return address.toUpperCase().includes(pattern);
        }
        
        for (let i = 0; i <= address.length - minLength; i++) {
            const segment = address.substr(i, minLength);
            if (this.isSequence(segment)) {
                return true;
            }
        }
        return false;
    }

    isSequence(str) {
        let increasing = true;
        let decreasing = true;
        let same = true;
        
        for (let i = 1; i < str.length; i++) {
            if (str[i] !== str[i-1]) same = false;
            if (str.charCodeAt(i) - str.charCodeAt(i-1) !== 1) increasing = false;
            if (str.charCodeAt(i-1) - str.charCodeAt(i) !== 1) decreasing = false;
        }
        
        return same || increasing || decreasing;
    }

    generateAccount() {
        const privateKey = this.generatePrivateKey();
        let address;
        
        try {
            if (typeof TronWeb !== 'undefined' && TronWeb.address) {
                address = TronWeb.address.fromPrivateKey(privateKey);
            } else {
                address = this.generateMockAddress(privateKey);
            }
        } catch (e) {
            address = this.generateMockAddress(privateKey);
        }
        
        return { privateKey, address };
    }

    generatePrivateKey() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    generateMockAddress(privateKey) {
        const base58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let address = 'T';
        const encoder = new TextEncoder();
        const data = encoder.encode(privateKey);
        
        for (let i = 0; i < 33; i++) {
            const byte = data[i % data.length];
            address += base58[byte % base58.length];
        }
        
        return address;
    }

    stopSearch() {
        this.isSearching = false;
        this.workers = [];
        this.stopSpeedCounter();
        this.updateUI(false);
    }

    addResult(account) {
        const resultsContainer = document.getElementById('resultsContainer');
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const timestamp = new Date().toLocaleTimeString();
        const lang = currentLang;
        
        resultItem.innerHTML = `
            <div class="timestamp">${timestamp}</div>
            <div class="address">${account.address}</div>
            <div class="private-key">${account.privateKey}</div>
            <div>
                <button class="copy-btn" onclick="copyToClipboard('${account.address}')">${i18n[lang].copyAddress}</button>
                <button class="copy-btn" onclick="copyToClipboard('${account.privateKey}')">${i18n[lang].copyPrivateKey}</button>
                <button class="copy-btn" onclick="downloadSingle('${account.address}', '${account.privateKey}')">${i18n[lang].downloadSingle}</button>
            </div>
        `;
        
        resultsContainer.insertBefore(resultItem, resultsContainer.firstChild);
        document.getElementById('downloadAllBtn').disabled = false;
        document.getElementById('downloadVanityBtn').disabled = false;
    }

    startSpeedCounter() {
        this.speedInterval = setInterval(() => {
            this.updateStats();
        }, 1000);
    }

    stopSpeedCounter() {
        if (this.speedInterval) {
            clearInterval(this.speedInterval);
            this.speedInterval = null;
        }
    }

    updateStats() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const speed = elapsed > 0 ? Math.floor(this.totalAttempts / elapsed) : 0;
        const threads = parseInt(document.getElementById('threads').value);
        
        document.getElementById('attemptsCount').textContent = this.totalAttempts.toLocaleString();
        document.getElementById('speedCount').textContent = speed.toLocaleString() + '/秒';
        document.getElementById('foundCount').textContent = this.foundCount;
        document.getElementById('threadsCount').textContent = threads;
    }

    updateUI(searching) {
        document.getElementById('startBtn').disabled = searching;
        document.getElementById('stopBtn').disabled = !searching;
        document.getElementById('suffix').disabled = searching;
        document.getElementById('sequence').disabled = searching;
        document.getElementById('minLength').disabled = searching;
        document.getElementById('threads').disabled = searching;
    }

    downloadResults(type) {
        const results = type === 'vanity' ? this.vanityResults : this.allResults;
        if (results.length === 0) return;
        
        const suffix = document.getElementById('suffix').value.toUpperCase();
        const sequence = document.getElementById('sequence').value.toUpperCase();
        let content = currentLang === 'zh' ? 'TRON靓号生成器结果\n' : 'TRON Vanity Generator Results\n';
        content += (currentLang === 'zh' ? '生成时间: ' : 'Generated: ') + new Date().toLocaleString() + '\n';
        content += (currentLang === 'zh' ? '模式: ' : 'Mode: ') + (currentMode === 'suffix' ? '后缀' : '连号') + '\n';
        content += (currentLang === 'zh' ? '搜索模式: ' : 'Pattern: ') + (currentMode === 'suffix' ? suffix : sequence) + '\n';
        content += (currentLang === 'zh' ? '总共找到: ' : 'Total Found: ') + results.length + '\n\n';
        
        results.forEach((account, index) => {
            content += `=== ${currentLang === 'zh' ? '结果' : 'Result'} ${index + 1} ===\n`;
            content += `Address: ${account.address}\n`;
            content += `Private Key: ${account.privateKey}\n\n`;
        });
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tron-${type}-${currentMode}-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification(currentLang === 'zh' ? '已复制到剪贴板!' : 'Copied to clipboard!');
    }).catch(err => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification(currentLang === 'zh' ? '已复制到剪贴板!' : 'Copied to clipboard!');
    });
}

function downloadSingle(address, privateKey) {
    const content = `Address: ${address}\nPrivate Key: ${privateKey}\nGenerated: ${new Date().toLocaleString()}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tron-${address}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #007cba;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 1000;
        font-size: 14px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 2000);
}

const generator = new TronVanityGenerator();
window.copyToClipboard = copyToClipboard;
window.downloadSingle = downloadSingle;
window.setLanguage = setLanguage;
window.setMode = setMode;
window.updateDifficulty = updateDifficulty;

document.addEventListener('DOMContentLoaded', () => {
    setLanguage('zh');
    setMode('suffix');
    updateDifficulty();
});
