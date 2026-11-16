const API = 'http://localhost:1337/api';

export async function registrarUsuario(nome, sobrenome, username, email, telefone, password, tipo_perfil) {
    try {
        const response = await fetch(`${API}/auth/local/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nome, sobrenome, username, email, telefone, password, tipo_perfil }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || 'Erro ao cadastrar usuário');
        }
        return data;
    } catch (error) {
        console.error('Erro no cadastro:', error.message);
        throw error;
    }
}

export async function fazerLogin(identifier, password) {
    try {
        const response = await fetch(`${API}/auth/local`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ identifier, password }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || 'Credenciais inválidas');
        }
        localStorage.setItem('jwt', data.jwt);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data;
    } catch (error) {
        console.error('Erro de login:', error.message);
        throw error;
    }
}

export async function verificarAutenticacao() {
    const token = localStorage.getItem('jwt');
    if (!token) {
        return null;
    }
    try {
        const response = await fetch(`${API}/users/me`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            fazerLogout();
            return null;
        }
        const user = await response.json();
        return user;
    } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        return null;
    }
}

export function fazerLogout(){
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
}
