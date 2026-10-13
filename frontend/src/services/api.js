import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const adminHeaders = () => ({
    'X-Admin-Token': localStorage.getItem('adminToken') || ''
});

export const sendChatMessage = async (message, sessionId = null) => {
    try {
        const payload = { message };
        if (sessionId) payload.session_id = sessionId;

        const response = await axios.post(`${API_BASE_URL}/assistant/chat`, payload);
        return response.data;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};

export const fetchTTSAudio = async (text) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/assistant/tts`, { text }, { responseType: 'blob' });
        return URL.createObjectURL(response.data);
    } catch (error) {
        console.error("TTS API Error:", error);
        throw error;
    }
};

export const fetchKnowledgeBlocks = async (filters = {}) => {
    const response = await axios.get(`${API_BASE_URL}/admin/knowledge-base/blocks`, {
        params: filters,
        headers: adminHeaders()
    });
    return response.data;
};

export const createKnowledgeBlock = async (payload) => {
    const response = await axios.post(`${API_BASE_URL}/admin/knowledge-base/blocks`, payload, {
        headers: adminHeaders()
    });
    return response.data;
};

export const updateKnowledgeBlock = async (id, payload) => {
    const response = await axios.put(`${API_BASE_URL}/admin/knowledge-base/blocks/${id}`, payload, {
        headers: adminHeaders()
    });
    return response.data;
};

export const deleteKnowledgeBlock = async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/admin/knowledge-base/blocks/${id}`, {
        headers: adminHeaders()
    });
    return response.data;
};

export const fetchKnowledgeContextPreview = async (filters = {}) => {
    const response = await axios.get(`${API_BASE_URL}/admin/knowledge-base/context`, {
        params: filters,
        headers: adminHeaders()
    });
    return response.data;
};
