const AppConfig = {
    BASE_URL: 'https://api-turbourl.onrender.com',
    ENDPOINTS: {
        REGISTER: '/user',
        LOGIN: '/login',
        USER: (id) => `/user/${id}`,
        SHORTEN: (id) => `/user/${id}/short`
    }
};

const Storage = {
    setUserId: (id) => localStorage.setItem('turbourl_id', id),
    getUserId: () => localStorage.getItem('turbourl_id'),
    clear: () => localStorage.removeItem('turbourl_id')
};

const API = {
    async call(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) options.body = JSON.stringify(body);

        try {
            const response = await fetch(`${AppConfig.BASE_URL}${endpoint}`, options);
            const data = await response.json();
            if (response.status === 429) throw new Error('Limite de requisições atingido. Tente em 15min.');
            if (!response.ok) throw new Error(data.error || 'Erro na requisição');
            return data;
        } catch (err) {
            UI.toast(err.message, 'error');
            throw err;
        }
    }
};

const UI = {
    toast(msg, type = 'success') {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.style.background = type === 'success' ? 'var(--success)' : 'var(--danger)';
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    },
    updateNav() {
        const nav = document.getElementById('nav-actions');
        if (!nav) return;
        const id = Storage.getUserId();
        nav.innerHTML = id
            ? `<a href="dashboard.html" class="btn btn-outline" style="margin-right:10px">Painel</a>
               <button onclick="Pages.logout()" class="btn btn-primary">Sair</button>`
            : `<a href="login.html" class="btn btn-outline" style="margin-right:10px">Login</a>
               <a href="register.html" class="btn btn-primary">Criar Conta</a>`;
    }
};

const Pages = {
    async register(e) {
        e.preventDefault();
        const payload = { name: e.target.name.value, email: e.target.email.value, password: e.target.password.value };
        await API.call(AppConfig.ENDPOINTS.REGISTER, 'POST', payload);
        UI.toast('Conta criada! Redirecionando...');
        setTimeout(() => window.location.href = 'login.html', 1500);
    },

    async login(e) {
        e.preventDefault();
        const payload = { email: e.target.email.value, password: e.target.password.value };
        const data = await API.call(AppConfig.ENDPOINTS.LOGIN, 'POST', payload);
        Storage.setUserId(data.id);
        window.location.href = 'dashboard.html';
    },

    async loadDashboard() {
        const id = Storage.getUserId();
        if (!id) return window.location.href = 'login.html';
        const data = await API.call(AppConfig.ENDPOINTS.USER(id));
        document.getElementById('user-welcome').innerText = `Olá, ${data.name}`;
        const list = document.getElementById('links-list');
        list.innerHTML = data.links.length
            ? data.links.map(l => `
                <div class="link-item animate">
                    <div>
                        <p style="color:var(--primary); font-weight:bold">/${l.shortId}</p>
                        <small style="color:var(--text-muted)">${l.originalUrl}</small>
                    </div>
                    <button class="btn btn-outline" onclick="Pages.copy('${l.shortId}')">Copiar</button>
                </div>`).join('')
            : '<p>Nenhum link ainda.</p>';
    },

    async shorten(e) {
        e.preventDefault();
        const id = Storage.getUserId();
        const payload = { url: e.target.url.value, expiresIn: e.target.expiresIn.value };
        await API.call(AppConfig.ENDPOINTS.SHORTEN(id), 'POST', payload);
        UI.toast('URL Encurtada!');
        e.target.reset();
        this.loadDashboard();
    },

    async loadProfile() {
        const id = Storage.getUserId();
        const data = await API.call(AppConfig.ENDPOINTS.USER(id));
        const f = document.getElementById('profile-form');
        f.name.value = data.name;
        f.email.value = data.email;
    },

    async updateProfile(e) {
        e.preventDefault();
        const id = Storage.getUserId();
        const payload = { name: e.target.name.value, email: e.target.email.value };
        if (e.target.password.value) payload.password = e.target.password.value;
        await API.call(AppConfig.ENDPOINTS.USER(id), 'PUT', payload);
        UI.toast('Perfil atualizado!');
    },

    async deleteAccount() {
        if (!confirm('Excluir conta permanentemente?')) return;
        await API.call(AppConfig.ENDPOINTS.USER(Storage.getUserId()), 'DELETE');
        this.logout();
    },

    copy(code) {
        navigator.clipboard.writeText(`${window.location.origin}/${code}`);
        UI.toast('Copiado!');
    },

    logout() {
        Storage.clear();
        window.location.href = 'index.html';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    UI.updateNav();
    const path = window.location.pathname;
    if (path.includes('dashboard.html')) Pages.loadDashboard();
    if (path.includes('profile.html')) Pages.loadProfile();
});