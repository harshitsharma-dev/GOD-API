import client from './client';

export const getDashboard = () =>
  client.get('/dashboard');

export const rotateKey = () =>
  client.post('/keys/rotate');
