import axios from 'axios';
const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:5000',withCredentials:true});
export const authApi={me:()=>api.get('/api/auth/me'),register:(data)=>api.post('/api/auth/register',data),login:(data)=>api.post('/api/auth/login',data),google:(idToken)=>api.post('/api/auth/google',{idToken}),updateProfile:(data)=>api.patch('/api/auth/profile',data),logout:()=>api.post('/api/auth/logout')};
export const interviewApi={list:()=>api.get('/api/interview'),history:()=>api.get('/api/interview/history'),start:(data)=>api.post('/api/interview/start',data),current:(id)=>api.get(`/api/interview/${id}/current`),answer:(id,data)=>api.post(`/api/interview/${id}/answer`,data),complete:(id)=>api.post(`/api/interview/${id}/complete`),get:(id)=>api.get(`/api/interview/${id}`),result:(id)=>api.get(`/api/interview/${id}/result`)};
export const resumeApi={upload:(file)=>{const f=new FormData();f.append('resume',file);return api.post('/api/resume/upload',f)}};
export const paymentApi={order:(plan)=>api.post('/api/payment/order',{plan}),verify:(data)=>api.post('/api/payment/verify',data)};
export const learningApi={recommendations:()=>api.get('/api/learning/recommendations')};
export default api;
