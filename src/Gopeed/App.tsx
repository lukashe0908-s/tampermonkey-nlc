import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Button, Skeleton, TextField, Slider } from '@mui/material';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';
import lodash from 'lodash';
import { getItemValue, setItemValue, formatFileSize } from '../util';

export default function App() {
  const originDomain = 'http://read.nlc.cn';
  const domain = `${process.env.NODE_ENV === 'development' ? 'http://localhost:12100/' : ''}${originDomain}`;
  const [rollList, setRollList] = useState<string[][]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloadCountTotal, setDownloadCountTotal] = useState(0);
  const downloadCountTotal_length = useMemo(() => {
    return Math.max(downloadCountTotal.toString().length, 2);
  }, [downloadCountTotal]);
  const [downloadCountTotalSelected, setDownloadCountTotalSelected] = useState([1, 1]);
  const [isDownloading, setIsDownloading] = useState(false);
  const stopFlagRef = useRef(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [logList, setLogList] = useState<string[]>([]);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const virtuosoGridRef = useRef(null as any);
  const [taskIdSet, setTaskIdSet] = useState<Set<string>>(new Set());
  const [taskList, setTaskList] = useState<any[]>([]);
  const [concurrency, setConcurrency] = useState(3);

  const downloadCountTotalSelectedCount = useMemo(() => {
    if (downloadCountTotal === 0) return 0;
    return Math.max(downloadCountTotalSelected[1], 1) - Math.max(downloadCountTotalSelected[0], 1) + 1;
  }, [downloadCountTotalSelected, downloadCountTotal]);

  useEffect(() => {
    setConcurrency(getItemValue('gopeed/concurrency') || 3);
    (async () => {
      if (window.location.pathname === '/') {
        setLoading(false);
        return;
      }
      const url = domain + window.location.href.replace(/https?:\/\/[^/]*?\//, '/');
      const html = await (
        await fetch(url, {
          referrerPolicy: 'no-referrer',
        })
      ).text();

      const parser = new DOMParser();
      const htmlParsed = parser.parseFromString(html, 'text/html');
      let rollListMatch = [...html.matchAll(/\/OutOpenBook\/OpenObjectBook\?aid=([0-9]*?)&bid=([0-9.]*)/g)];
      rollListMatch = lodash.uniqWith(rollListMatch, lodash.isEqual);
      const rollList = rollListMatch.map((m: any) => [m[1], m[2]]);
      setRollList(rollList);
      setDownloadCountTotal(rollList.length);
      setDownloadCountTotalSelected([1, rollList.length]);
      let titleStructure = getItemValue('titleStructure') || 'title-id';
      let title_pre = htmlParsed.querySelector('.Z_clearfix .title')?.textContent?.trim() || '';
      const fidMatch = window.location.search.match(/&fid=([^&]*)/);
      const fid = fidMatch?.[1] || 'unknown';
      if (titleStructure === 'title-id') {
        title_pre += '_' + fid;
      } else if (titleStructure === 'id') {
        title_pre = fid;
      }
      setTitle(title_pre);
      setLoading(false);
    })();
  }, []);
  useEffect(() => {
    const apiIP = getItemValue('gopeed/apiIP') || '127.0.0.1';
    const apiPort = getItemValue('gopeed/apiPort') || 9999;
    const apiToken = getItemValue('gopeed/apiToken') || '';

    let intervalTime = 1000; // 初始刷新间隔 1 秒
    let interval: NodeJS.Timeout;

    async function refresh() {
      try {
        const res = await fetch(`http://${apiIP}:${apiPort}/api/v1/tasks?notStatus=adone`, {
          headers: { 'X-Api-Token': apiToken },
        });
        const json = await res.json();
        if (json.code !== 0) throw new Error('API返回错误');

        const tasks = json.data.filter((t: any) => taskIdSet.has(t.id));
        setTaskList(tasks);

        // 成功时把间隔改回 1 秒（防止之前是 10 秒）
        if (intervalTime !== 1000) {
          intervalTime = 1000;
          clearInterval(interval);
          interval = setInterval(refresh, intervalTime);
        }
      } catch (e) {
        // 失败时改成10秒间隔（只有不等于才切换，避免重复清理和设置）
        if (intervalTime !== 10000) {
          intervalTime = 10000;
          clearInterval(interval);
          interval = setInterval(refresh, intervalTime);
        }
      }
    }

    refresh(); // 立即调用一次
    interval = setInterval(refresh, intervalTime);

    return () => clearInterval(interval);
  }, [taskIdSet]);
  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTo({
        behavior: 'smooth',
        top: logBoxRef.current.scrollHeight,
      });
    }
  }, [logList]);
  useEffect(() => {
    if (virtuosoGridRef.current) {
      virtuosoGridRef.current.scrollToIndex({
        index: taskList.length - 1,
        align: 'end',
        behavior: 'smooth',
      });
    }
  }, [taskList]);

  async function downloadSingle(aid: string, bid: string, index: number) {
    let customCookie = getItemValue('gopeed/downloadCookie');

    let token_page_req = await fetch(`${domain}/OutOpenBook/OpenObjectBook?aid=${aid}&bid=${bid}`, {
      cache: 'no-cache',
      referrerPolicy: 'no-referrer',
    });
    let token_page = await token_page_req.text();
    let tokenKey = token_page.match(/tokenKey="([^"]*?)"/)![1];
    let timeKey = token_page.match(/timeKey="([^"]*?)"/)![1];
    let timeFlag = token_page.match(/timeFlag="([^"]*?)"/)![1];
    if (!tokenKey || !timeKey || !timeFlag) {
      throw new Error(`第 ${index} 页未能提取下载参数`);
    }
    const url = `${originDomain}/menhu/OutOpenBook/getReaderNew?aid=${aid}&bid=${bid}&kime=${timeKey}&fime=${timeFlag}`;

    let apiIP = getItemValue('gopeed/apiIP') || '127.0.0.1';
    const apiPort = getItemValue('gopeed/apiPort') || 9999;
    const apiToken = getItemValue('gopeed/apiToken') || '';
    let folderPath = getItemValue('gopeed/folderPath') || '';
    folderPath = folderPath.replace(/[\\/]+$/, ''); // 去除结尾的 / 或 \
    const folderStructure = getItemValue('gopeed/folderStructure') || 'flat';

    let fileName = `${title}_${index.toString().padStart(downloadCountTotal_length, '0')}.pdf`;
    if (folderStructure === 'folder') {
      if (folderPath) {
        folderPath = `${folderPath}/${title}`;
      } else {
        folderPath = title;
      }
    } else if (folderStructure === 'folder-index-name') {
      if (folderPath) {
        folderPath = `${folderPath}/${title}`;
      } else {
        folderPath = title;
      }
      fileName = `${index.toString().padStart(downloadCountTotal_length, '0')}.pdf`;
    }
    const apiURL = `http://${apiIP}:${apiPort}/api/v1/tasks`;

    console.log(url, tokenKey);

    let callApiResult = await (
      await fetch(apiURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Token': apiToken,
        },
        body: JSON.stringify({
          req: {
            url,
            extra: {
              header: {
                'User-Agent': navigator.userAgent,
                ...(customCookie ? { Cookie: customCookie } : {}),
                Referer: 'http://read.nlc.cn/static/webpdf/lib/WebPDFJRWorker.js',
                myreader: tokenKey,
              },
            },
          },
          opt: {
            name: fileName,
            ...(folderPath ? { path: folderPath } : {}),
            extra: {
              connections: 1,
              notRange: true,
            },
          },
        }),
      })
    ).json();
    if (callApiResult.code !== 0) throw new Error(`API Return with Code ${callApiResult.code}. Reason: ${callApiResult.msg}`);
    return callApiResult;
  }

  async function startDownload() {
    if (isDownloading) return;
    setIsDownloading(true);
    stopFlagRef.current = false;

    setCurrentProgress(0);
    setLogList([]);

    const downloadDelay = parseInt(getItemValue('gopeed/downloadDelay') || '1000', 10);

    for (let i = downloadCountTotalSelected[0] - 1; i <= downloadCountTotalSelected[1] - 1; i++) {
      if (stopFlagRef.current) {
        setLogList(prev => [...prev, `🟡 已停止，未完成后续下载。`]);
        break;
      }

      const [aid, bid] = rollList[i];
      const index = i + 1;

      await waitForAvailableSlot(); // 等待有线程槽

      try {
        const result = await downloadSingle(aid, bid, index);
        setTaskIdSet(prev => new Set([...prev, result.data])); // 添加任务ID到监听集
        setLogList(prev => [...prev, `✅ 第 ${i + 1} 页 下载创建成功`]);
      } catch (error: any) {
        console.error(`第 ${index} 页 下载失败：${error.message}`);
        setLogList(prev => [...prev, `❌ 第 ${i + 1} 页 下载创建失败：${error.message}`]);
      }

      setCurrentProgress(index - downloadCountTotalSelected[0] + 1);
      await new Promise(r => setTimeout(r, downloadDelay));
    }

    setIsDownloading(false);
  }

  async function waitForAvailableSlot() {
    while (true) {
      const runningTasks = taskList.filter(t => t.status === 'running').length;
      if (runningTasks < concurrency) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async function stopDownload() {
    stopFlagRef.current = true;
    setIsDownloading(false);
  }

  return (
    <div className='px-4 py-6 flex flex-col gap-4 text-[16px]'>
      {loading ? (
        <Skeleton animation='wave' className='!h-[40em] !transform-none !rounded-[1em]' />
      ) : downloadCountTotal === 0 ? (
        <div className='flex justify-center'>
          <div className='rounded-lg border-2 border-red-400 border-dashed transition-all text-4xl font-bold text-center p-4'>
            未找到链接
          </div>
        </div>
      ) : (
        <>
          <div className='flex items-center gap-4'>
            <div className='w-[10em]'>选择下载范围：</div>
            <Slider
              value={downloadCountTotalSelected}
              onChange={(e, v) => setDownloadCountTotalSelected(v as number[])}
              valueLabelDisplay='auto'
              step={1}
              min={1}
              max={downloadCountTotal}
            />
            <TextField
              type='number'
              label='起始'
              className='w-[8em]'
              value={downloadCountTotalSelected[0]}
              onChange={e => {
                let start = parseInt(e.target.value, 10) || 1;
                let end = downloadCountTotalSelected[1];
                // 校正范围
                start = Math.max(1, Math.min(start, downloadCountTotal)); // 1 <= start <= total
                if (start > end) end = start;
                setDownloadCountTotalSelected([start, end]);
              }}
            />
            <TextField
              type='number'
              label='结束'
              className='w-[8em]'
              value={downloadCountTotalSelected[1]}
              onChange={e => {
                let end = parseInt(e.target.value, 10) || 1;
                let start = downloadCountTotalSelected[0];
                // 校正范围
                end = Math.max(1, Math.min(end, downloadCountTotal)); // 1 <= end <= total
                if (end < start) start = end;
                setDownloadCountTotalSelected([start, end]);
              }}
            />
          </div>

          <div className='flex gap-4'>
            <Button variant='contained' color='primary' onClick={startDownload} disabled={isDownloading}>
              {isDownloading ? '正在下载...' : '开始下载'}
            </Button>
            <Button variant='outlined' color='error' onClick={stopDownload}>
              停止
            </Button>
            <TextField
              label='下载线程'
              variant='standard'
              type='number'
              value={concurrency}
              onChange={e => {
                let thread = Number(e.target.value);

                if (isNaN(thread)) return;

                // 自动矫正范围
                if (thread < 1) thread = 1;
                if (thread > 32) thread = 32;

                setConcurrency(thread);
                setItemValue('gopeed/concurrency', thread);
                setCurrentProgress(thread);
              }}
              onBlur={e => {
                if (e.target.value === '') {
                  setConcurrency(1);
                  setItemValue('gopeed/concurrency', 1);
                  setCurrentProgress(1);
                }
              }}
            />

            <div className='text-gray-600'>
              总页数：{downloadCountTotal}，当前选择：{downloadCountTotalSelectedCount} 页
            </div>
          </div>

          {
            <div className='text-gray-700'>
              当前进度：{currentProgress}/{downloadCountTotalSelectedCount}
            </div>
          }
          <VirtuosoGrid
            ref={virtuosoGridRef}
            listClassName='flex flex-wrap'
            itemClassName='w-auto flex-none p-1'
            style={{ height: '20em' }}
            totalCount={taskList.length}
            itemContent={index => {
              const task = taskList[index];
              return (
                <>
                  <div className='border-blue-400 !rounded-lg w-full flex-col border-2 p-4'>
                    <div className='font-semibold text-blue-700'>{task.name}</div>
                    <div className='text-sm text-gray-500'>状态：{task.status}</div>
                    <div className='text-sm'>已下载：{formatFileSize(task.progress.downloaded)}</div>
                    <div className='text-sm text-gray-500'>速度：{formatFileSize(task.progress.speed)}/s</div>
                  </div>
                </>
              );
            }}
          />

          <div ref={logBoxRef} className='h-[10em] overflow-y-auto text-sm bg-gray-100 p-2 rounded-lg border'>
            {logList.map((log, index) => (
              <div key={index} className='whitespace-pre-wrap'>
                {log}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
