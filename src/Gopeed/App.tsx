import { useEffect, useState, useMemo, useRef } from 'react';
import { Button, Skeleton, TextField, Slider } from '@mui/material';
import lodash from 'lodash';
import { getItemValue, setItemValue, GM_ListCookie } from '../util';

export default function App() {
  const domain = `${process.env.NODE_ENV === 'development' ? 'http://localhost:12100/' : ''}http://read.nlc.cn`;
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

  const downloadCountTotalSelectedCount = useMemo(() => {
    if (downloadCountTotal === 0) return 0;
    return Math.max(downloadCountTotalSelected[1], 1) - Math.max(downloadCountTotalSelected[0], 1) + 1;
  }, [downloadCountTotalSelected, downloadCountTotal]);

  useEffect(() => {
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
      setTitle(htmlParsed.querySelector('.Z_clearfix .title')?.textContent?.trim() || '');
      setLoading(false);
    })();
  }, []);
  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logList]);

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
    const url = `${domain}/menhu/OutOpenBook/getReaderNew?aid=${aid}&bid=${bid}&kime=${timeKey}&fime=${timeFlag}`;

    let apiIP = getItemValue('gopeed/apiIP') || '127.0.0.1';
    const apiPort = getItemValue('gopeed/apiPort') || 31561;
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
              autoTorrent: false,
            },
          },
        }),
      })
    ).json();
    if (callApiResult.code !== 0) throw new Error(`API Return with Code ${callApiResult.code}. Reason: ${callApiResult.msg}`);
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
      try {
        await downloadSingle(aid, bid, i + 1);
        setLogList(prev => [...prev, `✅ 第 ${i + 1} 页 下载成功`]);
      } catch (error: any) {
        setLogList(prev => [...prev, `❌ 第 ${i + 1} 页 下载失败：${error.message}`]);
      }

      setCurrentProgress(i - (downloadCountTotalSelected[0] - 2)); // 从 1 开始数
      await new Promise(r => setTimeout(r, downloadDelay));
    }

    setIsDownloading(false);
  }

  async function stopDownload() {
    stopFlagRef.current = true;
    setIsDownloading(false);
  }

  return (
    <div className='px-4 py-6 flex flex-col gap-4 text-[16px]'>
      {loading ? (
        <Skeleton animation='wave' className='!h-[20em] !transform-none !rounded-[1em]' />
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
              onChange={e => setDownloadCountTotalSelected([Math.max(1, +e.target.value), downloadCountTotalSelected[1]])}
              inputProps={{ min: 1, max: downloadCountTotal }}
            />
            <TextField
              type='number'
              label='结束'
              className='w-[8em]'
              value={downloadCountTotalSelected[1]}
              onChange={e => setDownloadCountTotalSelected([downloadCountTotalSelected[0], Math.min(downloadCountTotal, +e.target.value)])}
              inputProps={{ min: 1, max: downloadCountTotal }}
            />
          </div>

          <div className='flex gap-4'>
            <Button variant='contained' color='primary' onClick={startDownload} disabled={isDownloading}>
              {isDownloading ? '正在下载...' : '开始下载'}
            </Button>
            <Button variant='outlined' color='error' onClick={stopDownload}>
              停止
            </Button>
            <div className='text-gray-600'>
              总页数：{downloadCountTotal}，当前选择：{downloadCountTotalSelectedCount} 页
            </div>
          </div>

          {
            <div className='text-gray-700'>
              当前进度：{currentProgress}/{downloadCountTotalSelectedCount}
            </div>
          }
          <div ref={logBoxRef} className='h-[20em] overflow-y-auto text-sm bg-gray-100 p-2 rounded-lg border'>
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
