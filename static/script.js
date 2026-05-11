let statusInterval = null;
let systemInterval = null;

// إضافة سجل
function addLog(message, type = 'info') {
    const logsContainer = document.getElementById('logsContainer');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString('ar-EG');
    logEntry.innerHTML = `[${time}] ${message}`;
    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

// تحديث معلومات النظام
async function updateSystemInfo() {
    try {
        const response = await fetch('/api/system');
        const data = await response.json();
        
        // تحديث CPU
        document.getElementById('cpuName').textContent = data.system.processor || data.system.platform;
        document.getElementById('cpuUsage').textContent = `${data.cpu.usage}%`;
        document.getElementById('cpuBar').style.width = `${data.cpu.usage}%`;
        
        // تحديث الذاكرة
        const memoryUsedGB = (data.memory.used / (1024**3)).toFixed(1);
        const memoryTotalGB = (data.memory.total / (1024**3)).toFixed(1);
        document.getElementById('memoryUsage').textContent = `${memoryUsedGB}GB / ${memoryTotalGB}GB (${data.memory.percent}%)`;
        document.getElementById('memoryBar').style.width = `${data.memory.percent}%`;
        
        // تحديث المساحة التخزينية
        const diskUsedGB = (data.disk.used / (1024**3)).toFixed(1);
        const diskTotalGB = (data.disk.total / (1024**3)).toFixed(1);
        document.getElementById('diskUsage').textContent = `${diskUsedGB}GB / ${diskTotalGB}GB (${data.disk.percent}%)`;
        document.getElementById('diskBar').style.width = `${data.disk.percent}%`;
        
        // تحديث عدد الـ threads ونظام التشغيل
        document.getElementById('activeThreads').textContent = data.threads.active;
        document.getElementById('osName').textContent = `${data.system.platform} ${data.system.platform_release}`;
        
        // تغيير لون شريط CPU حسب النسبة
        const cpuBar = document.getElementById('cpuBar');
        if (data.cpu.usage > 80) {
            cpuBar.style.background = '#fc8181';
        } else if (data.cpu.usage > 50) {
            cpuBar.style.background = '#f6ad55';
        } else {
            cpuBar.style.background = '#48bb78';
        }
        
        // تلوين شريط الذاكرة
        const memoryBar = document.getElementById('memoryBar');
        if (data.memory.percent > 80) {
            memoryBar.style.background = '#fc8181';
        } else if (data.memory.percent > 50) {
            memoryBar.style.background = '#f6ad55';
        } else {
            memoryBar.style.background = '#48bb78';
        }
        
    } catch (error) {
        console.error('Error fetching system info:', error);
    }
}

// تحديث الوقت
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// بدء البحث
async function startSearch() {
    const studentId = document.getElementById('studentId').value.trim();
    const startRange = document.getElementById('startRange').value;
    const endRange = document.getElementById('endRange').value;
    
    if (!studentId) {
        addLog('❌ الرجاء إدخال رقم الطالب', 'error');
        return;
    }
    
    if (parseInt(startRange) >= parseInt(endRange)) {
        addLog('❌ نطاق البحث غير صحيح', 'error');
        return;
    }
    
    addLog(`🔍 بدء البحث عن رقم الطالب: ${studentId}`);
    addLog(`📊 النطاق: ${startRange} - ${endRange}`);
    
    try {
        const response = await fetch('/api/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: studentId,
                start_range: startRange,
                end_range: endRange
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'started') {
            addLog(`✅ بدأ البحث بنجاح - ${data.total} كلمة سر للفحص باستخدام ${data.threads} thread`);
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = false;
            document.getElementById('progressSection').style.display = 'block';
            document.getElementById('resultsSection').style.display = 'none';
            
            if (statusInterval) clearInterval(statusInterval);
            if (systemInterval) clearInterval(systemInterval);
            
            statusInterval = setInterval(updateStatus, 500); // تحديث أسرع للسرعة اللحظية
            systemInterval = setInterval(updateSystemInfo, 2000);
        } else if (data.error) {
            addLog(`❌ ${data.error}`, 'error');
        }
    } catch (error) {
        addLog(`❌ خطأ: ${error.message}`, 'error');
    }
}

// إيقاف البحث
async function stopSearch() {
    addLog('⏹️ جاري إيقاف البحث...');
    
    try {
        await fetch('/api/stop', { method: 'POST' });
        addLog('✅ تم إيقاف البحث');
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        
        if (statusInterval) {
            clearInterval(statusInterval);
            statusInterval = null;
        }
        if (systemInterval) {
            clearInterval(systemInterval);
            systemInterval = null;
        }
    } catch (error) {
        addLog(`❌ خطأ: ${error.message}`, 'error');
    }
}

// تحديث الحالة
async function updateStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        const progress = data.progress || 0;
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('progressBar').textContent = `${Math.round(progress)}%`;
        
        document.getElementById('checkedCount').textContent = data.checked.toLocaleString();
        document.getElementById('remainingCount').textContent = data.remaining.toLocaleString();
        document.getElementById('speedCount').textContent = data.speed;
        document.getElementById('instantSpeedCount').textContent = data.instant_speed;
        document.getElementById('elapsedTime').textContent = formatTime(data.elapsed);
        document.getElementById('successCount').textContent = data.successful;
        document.getElementById('failedCount').textContent = data.failed;
        
        // إضافة تأثير عند السرعة العالية
        const instantSpeedElem = document.getElementById('instantSpeedCount');
        if (data.instant_speed > 50) {
            instantSpeedElem.style.color = '#fbbf24';
            instantSpeedElem.style.fontSize = '1.8rem';
        } else if (data.instant_speed > 20) {
            instantSpeedElem.style.color = '#68d391';
        } else {
            instantSpeedElem.style.color = '#a0aec0';
        }
        
        if (data.eta > 0) {
            document.getElementById('etaTime').textContent = formatTime(data.eta);
        }
        
        if (data.found) {
            document.getElementById('resultsSection').style.display = 'block';
            document.getElementById('foundPassword').textContent = data.found_password;
            document.getElementById('foundLocation').textContent = data.found_location || 'تم التحويل';
            addLog(`🎉 تم العثور على كلمة السر: ${data.found_password}`, 'success');
            stopSearch();
        }
        
        if (!data.active && data.found === false && data.checked > 0) {
            addLog('⚠️ اكتمل البحث دون العثور على كلمة السر', 'warning');
            stopSearch();
        }
        
        // تحديث شريط التقدم في معلومات النظام
        updateSystemInfo();
        
    } catch (error) {
        console.error('Error fetching status:', error);
    }
}

// مسح السجلات
function clearLogs() {
    const logsContainer = document.getElementById('logsContainer');
    logsContainer.innerHTML = '<div class="log-entry info">✨ تم مسح السجل</div>';
}

// بدء تحديث معلومات النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    updateSystemInfo();
    setInterval(updateSystemInfo, 3000);
});

// إضافة مستمعي الأحداث
document.getElementById('startBtn').addEventListener('click', startSearch);
document.getElementById('stopBtn').addEventListener('click', stopSearch);
document.getElementById('clearLogsBtn').addEventListener('click', clearLogs);

// إدخال بالضغط على Enter
document.getElementById('studentId').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') startSearch();
});

addLog('✨ النظام جاهز. أدخل رقم الطالب وابدأ البحث.');
