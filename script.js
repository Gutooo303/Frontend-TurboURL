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
            headers: {}
        };

        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }

        try {
            console.log('ENDPOINT:', endpoint);
            console.log('BODY:', body);

            const response = await fetch(
                `${AppConfig.BASE_URL}${endpoint}`,
                options
            );

            const text = await response.text();

            console.log('STATUS:', response.status);
            console.log('RESPONSE:', text);

            let data = {};

            try {
                data = text ? JSON.parse(text) : {};
            } catch {
                data = {
                    message: text
                };
            }

            if (response.status === 429) {
                throw new Error(
                    'Limite de requisições atingido. Tente novamente em 15 minutos.'
                );
            }

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    data.message ||
                    `Erro ${response.status}`
                );
            }

            return data;
        } catch (err) {
            console.error(err);

            UI.toast(
                err.message || 'Erro de conexão',
                'error'
            );

            throw err;
        }
    }
};

const UI = {
    toast(msg, type = 'success') {
        const toast = document.getElementById('toast');

        if (!toast) return;

        toast.innerText = msg;

        toast.style.background =
            type === 'success'
                ? 'var(--success)'
                : 'var(--danger)';

        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    },

    updateNav() {
        const nav = document.getElementById('nav-actions');

        if (!nav) return;

        const id = Storage.getUserId();

        nav.innerHTML = id
            ? `
                <a
                    href="dashboard.html"
                    class="btn btn-outline"
                    style="margin-right:10px"
                >
                    Painel
                </a>

                <button
                    onclick="Pages.logout()"
                    class="btn btn-primary"
                >
                    Sair
                </button>
            `
            : `
                <a
                    href="login.html"
                    class="btn btn-outline"
                    style="margin-right:10px"
                >
                    Login
                </a>

                <a
                    href="register.html"
                    class="btn btn-primary"
                >
                    Criar Conta
                </a>
            `;
    }
};

const Pages = {
    async register(e) {
        e.preventDefault();

        const form = e.target;

        const payload = {
            name: form.querySelector('[name="name"]').value,
            email: form.querySelector('[name="email"]').value,
            password: form.querySelector('[name="password"]').value
        };

        await API.call(
            AppConfig.ENDPOINTS.REGISTER,
            'POST',
            payload
        );

        UI.toast('Conta criada com sucesso!');

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    },

    async login(e) {
        e.preventDefault();

        const form = e.target;

        const payload = {
            email: form.querySelector('[name="email"]').value,
            password: form.querySelector('[name="password"]').value
        };

        const data = await API.call(
            AppConfig.ENDPOINTS.LOGIN,
            'POST',
            payload
        );

        console.log('LOGIN DATA:', data);

        Storage.setUserId(data.id);

        UI.toast('Login realizado com sucesso!');

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    },

    async loadDashboard() {
        const id = Storage.getUserId();

        if (!id) {
            window.location.href = 'login.html';
            return;
        }

        const data = await API.call(
            AppConfig.ENDPOINTS.USER(id)
        );

        const welcome = document.getElementById('user-welcome');

        if (welcome) {
            welcome.innerText = `Olá, ${data.name}`;
        }

        const list = document.getElementById('links-list');

        if (!list) return;

        list.innerHTML = data.links?.length
            ? data.links.map(link => `
                <div class="link-item animate">
                    <div>
                        <p
                            style="
                                color:var(--primary);
                                font-weight:bold
                            "
                        >
                            /${link.shortId}
                        </p>

                        <small
                            style="
                                color:var(--text-muted)
                            "
                        >
                            ${link.originalUrl}
                        </small>
                    </div>

                    <button
                        class="btn btn-outline"
                        onclick="Pages.copy('${link.shortId}')"
                    >
                        Copiar
                    </button>
                </div>
            `).join('')
            : '<p>Nenhum link encontrado.</p>';
    },

    async shorten(e) {
        e.preventDefault();

        const form = e.target;

        const id = Storage.getUserId();

        const payload = {
            url: form.querySelector('[name="url"]').value,
            expiresIn: form.querySelector('[name="expiresIn"]').value
        };

        await API.call(
            AppConfig.ENDPOINTS.SHORTEN(id),
            'POST',
            payload
        );

        UI.toast('URL encurtada com sucesso!');

        form.reset();

        await this.loadDashboard();
    },

    async loadProfile() {
        const id = Storage.getUserId();

        if (!id) {
            window.location.href = 'login.html';
            return;
        }

        const data = await API.call(
            AppConfig.ENDPOINTS.USER(id)
        );

        const form = document.getElementById('profile-form');

        if (!form) return;

        form.querySelector('[name="name"]').value =
            data.name || '';

        form.querySelector('[name="email"]').value =
            data.email || '';
    },

    async updateProfile(e) {
        e.preventDefault();

        const form = e.target;

        const id = Storage.getUserId();

        const payload = {
            name: form.querySelector('[name="name"]').value,
            email: form.querySelector('[name="email"]').value
        };

        const password =
            form.querySelector('[name="password"]').value;

        if (password) {
            payload.password = password;
        }

        await API.call(
            AppConfig.ENDPOINTS.USER(id),
            'PUT',
            payload
        );

        UI.toast('Perfil atualizado com sucesso!');
    },

    async deleteAccount() {
        const confirmDelete = confirm(
            'Deseja realmente excluir sua conta permanentemente?'
        );

        if (!confirmDelete) return;

        await API.call(
            AppConfig.ENDPOINTS.USER(
                Storage.getUserId()
            ),
            'DELETE'
        );

        this.logout();
    },

    copy(code) {
        navigator.clipboard.writeText(
            `${window.location.origin}/${code}`
        );

        UI.toast('Link copiado!');
    },

    logout() {
        Storage.clear();

        window.location.href = 'index.html';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    UI.updateNav();

    const loginForm =
        document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener(
            'submit',
            Pages.login
        );
    }

    const registerForm =
        document.getElementById('register-form');

    if (registerForm) {
        registerForm.addEventListener(
            'submit',
            Pages.register
        );
    }

    const shortenForm =
        document.getElementById('shorten-form');

    if (shortenForm) {
        shortenForm.addEventListener(
            'submit',
            Pages.shorten
        );
    }

    const profileForm =
        document.getElementById('profile-form');

    if (profileForm) {
        profileForm.addEventListener(
            'submit',
            Pages.updateProfile
        );
    }

    const path = window.location.pathname;

    if (path.includes('dashboard.html')) {
        Pages.loadDashboard();
    }

    if (path.includes('profile.html')) {
        Pages.loadProfile();
    }
});
