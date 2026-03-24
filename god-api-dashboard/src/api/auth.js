import client from './client';

export const signup = (name, email, password) =>
  client.post('/auth/signup', { name, email, password });

export const login = (email, password) =>
  client.post('/auth/login', { email, password });

export const getMe = () =>
  client.get('/auth/me');
