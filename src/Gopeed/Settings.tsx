import { useEffect, useState, useMemo } from 'react';
import { Button, Skeleton, TextField, Slider, Card, Divider, MenuItem } from '@mui/material';
import { getItemValue, setItemValue } from '../util';

export default function Settings() {
  const [folderPath, setFolderPath] = useState('');
  const [folderStructure, setFolderStructure] = useState('flat');
  const [downloadDelay, setDownloadDelay] = useState('300');
  const [downloadCookie, setDownloadCookie] = useState('');
  const [apiIP, setApiIP] = useState('127.0.0.1');
  const [apiPort, setApiPort] = useState('9999');
  const [apiToken, setApiToken] = useState('');

  useEffect(() => {
    setFolderPath(getItemValue('gopeed/folderPath'));
    setApiIP(getItemValue('gopeed/apiIP') || '127.0.0.1');
    setApiPort(getItemValue('gopeed/apiPort') || '9999');
    setApiToken(getItemValue('gopeed/apiToken'));
    setFolderStructure(getItemValue('gopeed/folderStructure') || 'flat');
    setDownloadDelay(getItemValue('gopeed/downloadDelay') || '1000');
    setDownloadCookie(getItemValue('gopeed/downloadCookie') || '');
  }, []);

  function updateValue(key: string, value: string, setter: (v: string) => void) {
    setItemValue(key, value);
    setter(value);
  }

  return (
    <div className='px-1 py-4 flex flex-col gap-4 !text-[16px]'>
      <Card className='!rounded-lg p-3' variant='outlined'>
        <div className='my-2'>
          <p className='font-bold text-xl'>下载</p>
          <TextField
            label='下载文件夹路径'
            variant='standard'
            className='w-[20em] max-w-full !mr-4'
            value={folderPath}
            onChange={e => updateValue('gopeed/folderPath', e.target.value, setFolderPath)}
          />
          <TextField
            select
            label='目录结构'
            variant='standard'
            className='w-[20em] max-w-full !mr-4'
            value={folderStructure}
            onChange={e => updateValue('gopeed/folderStructure', e.target.value, setFolderStructure)}
            helperText='选择下载的保存路径结构'>
            <MenuItem value='flat'>扁平化（默认）</MenuItem>
            <MenuItem value='folder'>目录结构（使用标题创建文件夹）</MenuItem>
            <MenuItem value='folder-index-name'>目录结构（使用标题创建文件夹，文件名仅包含序号）</MenuItem>
          </TextField>
          <br />
          <TextField
            label='下载间隔（ms）'
            variant='standard'
            className='w-[10em] max-w-full !mr-4'
            type='number'
            value={downloadDelay}
            onChange={e => updateValue('gopeed/downloadDelay', e.target.value, setDownloadDelay)}
            helperText='每次下载之间的等待时间'
          />
          <TextField
            label='自定义请求Cookie'
            variant='standard'
            className='w-[20em] max-w-full !mr-4'
            value={downloadCookie}
            onChange={e => updateValue('gopeed/downloadCookie', e.target.value, setDownloadCookie)}
            helperText=''
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
            onChange={e => updateValue('gopeed/apiIP', e.target.value, setApiIP)}
          />
          <TextField
            label='连接端口'
            variant='standard'
            className='w-[6em] max-w-full'
            type='number'
            value={apiPort}
            onChange={e => updateValue('gopeed/apiPort', e.target.value, setApiPort)}
          />
          <br />
          <TextField
            label='Token'
            variant='standard'
            className='w-[20em] max-w-full'
            value={apiToken}
            onChange={e => updateValue('gopeed/apiToken', e.target.value, setApiToken)}
          />
        </div>
      </Card>
      <Divider></Divider>
      <Card className='!rounded-lg p-3' elevation={0}>
        <p className='font-bold text-xl'>Gopeed下载</p>
        <a href='https://gopeed.com/' target='_blank' rel='noreferrer' className='text-blue-600'>
          官网
        </a>
        &ensp;&ensp;&ensp;&ensp;
        <a href='https://github.com/GopeedLab/gopeed/releases' target='_blank' rel='noreferrer' className='text-blue-600'>
          Github
        </a>
        <br />
        <p className='mr-1'>Gopeed Fork版 下载</p>
        <a href='https://github.com/LukasHe0908/gopeed/releases' target='_blank' rel='noreferrer' className='text-blue-600'>
          Github
        </a>
        <br />
        <p>提示：请下载 Fork版 以确保能够正常下载</p>
      </Card>
    </div>
  );
}
