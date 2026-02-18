import axios from 'axios';
import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/reports`;

/**
 * Submit a content report (video or short)
 */
export const submitReport = async ({ contentType, contentId, reporterId, reason, details }) => {
  try {
    const response = await axios.post(API_URL, {
      contentType,
      contentId,
      reporterId: reporterId || undefined,
      reason,
      details: details || undefined,
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting report:', error);
    throw error;
  }
};
