import Papa from 'papaparse';
import { GuestGroup } from '../types';

export const parseCSVFromUrl = async (url: string): Promise<GuestGroup[]> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    let text = await response.text();
    
    // Check if the response is actually HTML (e.g., Google Login page or regular sheet link)
    if (text.trim().toLowerCase().startsWith('<!doctype html') || text.trim().toLowerCase().startsWith('<html')) {
      throw new Error('URL_IS_HTML');
    }

    // Strip BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }

    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log('Raw CSV Data:', results.data); // For debugging
          
          const guests: GuestGroup[] = results.data
            .map((row: any, index: number) => {
              // Flexible column matching
              const findValue = (keys: string[], exclude: string[] = []) => {
                const rowKeys = Object.keys(row);
                // First try exact match
                let key = rowKeys.find(k => {
                  const cleanK = k.replace(/^\uFEFF/, '').trim();
                  return keys.some(target => cleanK === target);
                });
                // Then try includes match, but skip excluded terms
                if (!key) {
                  key = rowKeys.find(k => {
                    const cleanK = k.replace(/^\uFEFF/, '').trim();
                    return keys.some(target => cleanK.includes(target)) && 
                           !exclude.some(ex => cleanK.includes(ex));
                  });
                }
                return key ? row[key] : undefined;
              };

              const name = findValue(['姓名', 'Name', '賓客']) || '';
              const attendingRaw = (findValue(['是否出席', '出席', 'Attending', 'Status']) || '').toString().trim();
              
              // Debug log for each row
              console.log(`Processing Row ${index}: Name="${name}", AttendingRaw="${attendingRaw}"`);

              // Specific attending check: "準時" vs "無法"
              // Using .includes() to be more robust against extra spaces or characters
              let finalAttending = false;
              if (attendingRaw.includes('準時')) {
                finalAttending = true;
              } else if (attendingRaw.includes('無法')) {
                finalAttending = false;
              } else {
                // Fallback for other common formats
                finalAttending = /是|Yes|1|True/i.test(attendingRaw);
              }
              
              const adults = parseInt(findValue(['大人', 'Adults', '成人']) || '0', 10) || 0;
              const kids = parseInt(findValue(['兒童', 'Kids', '小孩']) || '0', 10) || 0;
              const childChairs = parseInt(findValue(['兒童椅', 'Chairs', '椅子']) || '0', 10) || 0;
              const vegetarian = parseInt(findValue(['素食', 'Vegetarian', '蔬食']) || '0', 10) || 0;
              const address = (findValue(['您的詳細 收件地址', '收件地址', '寄送地址', '地址', 'Address'], ['電子郵件', 'Email', '信箱']) || '').toString().trim();
              const zipCode = (findValue(['郵遞區號', 'Zip', 'Postcode']) || '').toString().trim();
              const relationship = (findValue(['與新人的關係', '關係', 'Relationship', '類別']) || '其他').toString().trim();
              
              return {
                id: `guest-${index}-${Date.now()}`,
                name: name.toString().trim(),
                attending: finalAttending,
                adults,
                kids,
                total: adults + kids,
                childChairs,
                vegetarian,
                address,
                zipCode,
                source: 'sheet' as const,
                relationship,
              };
            })
            .filter((guest) => guest.name);
            
          resolve(guests);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  } catch (error) {
    throw error;
  }
};
