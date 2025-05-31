import { useEffect, useState, useMemo } from 'react';
import { Button, Skeleton, TextField, Slider, Card, Divider } from '@mui/material';

export default function Settings() {
  const [folderPath, setFolderPath] = useState('');
  const [apiIP, setApiIP] = useState('127.0.0.1');
  const [apiPort, setApiPort] = useState('9999');
  const [apiToken, setApiToken] = useState('');

  useEffect(() => {
    if (typeof GM_getValue === 'function') {
      setFolderPath(GM_getValue('folderPath'));
      setApiIP(GM_getValue('apiIP'));
      setApiPort(GM_getValue('apiPort'));
      setApiToken(GM_getValue('apiToken'));
    }
  }, []);

  function updateValue(key: string, value: string, setter: (v: string) => void) {
    if (typeof GM_setValue === 'function') GM_setValue(key, value);
    setter(value);
  }

  return (
    <div className='px-1 py-4 flex flex-col gap-4 !text-[16px]'>
      <Card className='!rounded-lg p-3' variant='outlined'>
        <div className='my-2'>
          <p className='font-bold text-xl'>下载位置</p>
          <TextField
            label='文件夹路径'
            variant='standard'
            className='w-[20em] max-w-full !mr-2'
            value={folderPath}
            onChange={e => updateValue('folderPath', e.target.value, setFolderPath)}
          />
        </div>
        <Divider></Divider>
        <div className='my-2'>
          <p className='font-bold text-xl'>API连接</p>
          <TextField
            label='连接IP'
            variant='standard'
            className='w-[13em] max-w-full !mr-2'
            value={apiIP}
            onChange={e => updateValue('apiIP', e.target.value, setApiIP)}
          />
          <TextField
            label='连接端口'
            variant='standard'
            className='w-[6em] max-w-full'
            type='number'
            value={apiPort}
            onChange={e => updateValue('apiPort', e.target.value, setApiPort)}
          />
          <br />
          <TextField
            label='Token'
            variant='standard'
            className='w-[20em] max-w-full'
            value={apiToken}
            onChange={e => updateValue('apiToken', e.target.value, setApiToken)}
          />
        </div>
      </Card>
      <Divider></Divider>
      <Card className='!rounded-lg p-3' elevation={0}>
        <p className='font-bold text-xl'>Gopeed下载</p>
        <a href='https://gopeed.com/' className='text-blue-600'>
          官网
        </a>
        &ensp;&ensp;&ensp;&ensp;
        <a href='https://github.com/GopeedLab/gopeed/releases/latest' className='text-blue-600'>
          Github
        </a>
      </Card>
    </div>
  );
}
