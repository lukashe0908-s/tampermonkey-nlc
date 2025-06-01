import { useEffect, useState, useMemo } from 'react';
import { Button, Skeleton, TextField, Slider } from '@mui/material';
import axios from 'axios';
import lodash from 'lodash';
import { fileConfig, downloadFile } from '../util';
import { Download } from './Download';
import { getItemValue, setItemValue } from '../util';

let stop = true;
let forceStop = false;

export default function App() {
  let domain = `${process.env.NODE_ENV === 'development' ? 'http://localhost:12100/' : ''}http://read.nlc.cn`;
  const [MAX_CONCURRENT_DOWNLOADS, setMAX_CONCURRENT_DOWNLOADS] = useState(4);
  const [rollList, setRollList] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [fileList, setFileList] = useState<fileConfig[]>([]);
  const [downloadFinished, setDownloadFinished] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState<number[]>([]);
  const [downloadCountCurrent, setDownloadCountCurrent] = useState(0);
  const [downloadCountTotal, setDownloadCountTotal] = useState(0);
  const downloadCountTotal_length = useMemo(() => {
    return Math.max(downloadCountTotal.toString().length, 2);
  }, [downloadCountTotal]);
  const [downloadCountTotalSelected, setDownloadCountTotalSelected] = useState<number[]>([]);
  const downloadCountTotalSelectedCount = useMemo(() => {
    if (downloadCountTotal === 0) return 0;
    return Math.max(downloadCountTotalSelected[1], 1) - Math.max(downloadCountTotalSelected[0], 1) + 1;
  }, [downloadCountTotalSelected, downloadCountTotal]);
  const [downloadOptionSelected, setDownloadOptionSelected] = useState(0);
  useEffect(() => {
    if (downloadCountTotal === 0) {
      setDownloadCountTotalSelected([0, 0]);
      return;
    }
    setDownloadCountTotalSelected([1, downloadCountTotal]);
  }, [downloadCountTotal]);
  useEffect(() => {
    (async () => {
      if (window.location.pathname === '/') {
        setLoading(false);
        return;
      }
      let url = domain + window.location.href.replace(/https?:\/\/[^/]*?\//, '/');
      // console.log(url);
      const html = await (
        await fetch(url, {
          referrerPolicy: 'no-referrer',
        })
      ).text();
      const parser = new DOMParser();
      const htmlParsed = parser.parseFromString(html, 'text/html');
      let rollListMatch = [...html.matchAll(/\/OutOpenBook\/OpenObjectBook\?aid=([0-9]*?)&bid=([0-9.]*)/g)];
      rollListMatch = lodash.uniqWith(rollListMatch, lodash.isEqual);
      const rollList = rollListMatch.map((value: any, index) => {
        let foo = value;
        foo[0] = index.toString();
        return foo;
      });
      setRollList(rollList as unknown as string[]);
      setDownloadCountTotal(rollList.length);
      let titleStructure = getItemValue('titleStructure') || 'title-id';
      let title_pre = htmlParsed.querySelector('.Z_clearfix .title')?.textContent?.trim() || '';
      if (titleStructure === 'title-id') {
        title_pre += '_' + window.location.search.match(/&fid=([^&]*)/)![1];
      } else if (titleStructure === 'id') {
        title_pre = window.location.search.match(/&fid=([^&]*)/)![1];
      }
      setTitle(title_pre);
      setLoading(false);
    })();
    if (getItemValue('browser/MAX_CONCURRENT_DOWNLOADS')) setMAX_CONCURRENT_DOWNLOADS(getItemValue('browser/MAX_CONCURRENT_DOWNLOADS')!);
    let currentDownloadsPercent: number[] = [];
    for (let i = 0; i < MAX_CONCURRENT_DOWNLOADS; i++) {
      currentDownloadsPercent[i] = 0;
    }
    setDownloadProgress(currentDownloadsPercent);
  }, []);

  return (
    <div className='px-1 py-4 flex flex-col gap-4 !text-[16px]'>
      {loading ? (
        <Skeleton animation='wave' className='!h-[35em] !transform-none !rounded-[1em]' />
      ) : downloadCountTotal === 0 ? (
        <div className='flex justify-center'>
          <div className={`!rounded-lg border-2 border-red-400 border-dashed transition-all text-4xl font-bold text-center p-4`}>
            未找到链接
          </div>
        </div>
      ) : (
        <>
          <div className='flex gap-2 items-center'>
            <div className='flex flex-col pt-3 gap-4 w-full'>
              <div className='flex gap-1'>
                <Button
                  variant='contained'
                  className='text-nowrap !rounded-lg w-full'
                  disabled={!downloadFinished && stop}
                  onClick={async () => {
                    if (!downloadFinished) {
                      stop = true;
                      return;
                    }
                    stop = false;
                    forceStop = false;
                    setFileList([]);
                    setDownloadFinished(false);
                    setDownloadCountCurrent(0);
                    if (downloadCountTotalSelectedCount === 0) {
                      setDownloadFinished(true);
                      return;
                    }
                    async function downloadElement(aid: string, bid: string, index: number, workerId: number) {
                      currentDownloadsPercent[workerId] = 0;
                      setDownloadProgress([...currentDownloadsPercent]);
                      let token_page = await (
                        await fetch(`${domain}/OutOpenBook/OpenObjectBook?aid=${aid}&bid=${bid}`, {
                          cache: 'no-cache',
                          referrerPolicy: 'no-referrer',
                        })
                      ).text();
                      let tokenKey = token_page.match(/tokenKey="([^"]*?)"/)![1];
                      let timeKey = token_page.match(/timeKey="([^"]*?)"/)![1];
                      let timeFlag = token_page.match(/timeFlag="([^"]*?)"/)![1];
                      let config = {
                        index: index,
                        url: `${domain}/menhu/OutOpenBook/getReaderNew?aid=${aid}&bid=${bid}&kime=${timeKey}&fime=${timeFlag}`,
                        token: tokenKey,
                        content: undefined as unknown as Blob,
                        size: 0,
                      };

                      let content = await getBlob();
                      async function getBlob(): Promise<Blob> {
                        return new Promise(async (resolve, reject) => {
                          const controller = new AbortController();
                          const interval = setInterval(() => {
                            if (forceStop) controller.abort();
                          }, 10);
                          let response = await fetch(config.url, {
                            method: 'GET',
                            referrer: 'http://read.nlc.cn/static/webpdf/lib/WebPDFJRWorker.js',
                            headers: {
                              myreader: config.token,
                            },
                          });

                          const reader = response.body!.getReader();
                          const contentLength: any = response.headers.get('Content-Length');
                          let receivedLength = 0;
                          let chunks = [];
                          while (true) {
                            const { done, value } = await reader.read();

                            if (done) {
                              break;
                            }

                            chunks.push(value);
                            receivedLength += value.length;

                            // console.log(`Received ${receivedLength} of ${contentLength}`);
                            let percentCompleted = (receivedLength / contentLength) * 100;
                            currentDownloadsPercent[workerId] = percentCompleted;
                            setDownloadProgress([...currentDownloadsPercent]);
                          }

                          const data = new Blob(chunks, { type: 'application/pdf' });
                          resolve(data);
                          clearInterval(interval);
                        });
                      }
                      if (content.size === 0) throw new Error(`下载失败,返回空 (index: ${index}) (workerId: ${workerId})`);
                      config.size = content.size;
                      if (downloadOptionSelected === 0 || downloadOptionSelected === 1) {
                        config.content = content;
                      }
                      if (downloadOptionSelected === 1 || downloadOptionSelected === 2) {
                        downloadFile(content, index + 1, title, 'pdf', !(downloadCountTotal === 1), downloadCountTotal_length);
                      }
                      return config;
                    }
                    async function waitForDownloadCompletion(index: number) {
                      return new Promise(resolve => {
                        const checkCompletion = setInterval(() => {
                          if (currentDownloads < MAX_CONCURRENT_DOWNLOADS && temp_downloaded + MAX_CONCURRENT_DOWNLOADS > index) {
                            clearInterval(checkCompletion);
                            resolve(undefined);
                          }
                        }, 10);
                      });
                    }

                    let temp_array: any[] = [];
                    let temp_download = 0;
                    let temp_downloaded = 0;
                    let currentDownloads = 0;
                    let currentDownloadsPercent: number[] = [];
                    let downloadsList: any = {};
                    for (let i = 0; i < MAX_CONCURRENT_DOWNLOADS; i++) {
                      downloadsList[i] = false;
                    }
                    for (let i = 0; i < MAX_CONCURRENT_DOWNLOADS; i++) {
                      currentDownloadsPercent[i] = 0;
                    }
                    let rollList_filter = rollList.filter((value, index) => {
                      if (
                        index >= Math.max(downloadCountTotalSelected[0], 1) - 1 &&
                        index <= Math.max(downloadCountTotalSelected[1], 1) - 1
                      ) {
                        return true;
                      }
                      return false;
                    });
                    for (const key in rollList_filter) {
                      if (Object.prototype.hasOwnProperty.call(rollList_filter, key)) {
                        let relative_index = Number(key);
                        const element = rollList_filter[key];
                        let index = element[0];
                        let aid = element[1];
                        let bid = element[2];
                        // 控制同时下载的数量
                        // eslint-disable-next-line no-loop-func
                        (async () => {
                          if (currentDownloads >= MAX_CONCURRENT_DOWNLOADS) await waitForDownloadCompletion(relative_index);
                          if (stop) return;
                          currentDownloads++;
                          const workerId = lodash.findKey(downloadsList, function (o) {
                            return o === false;
                          })!;
                          downloadsList[workerId] = true;
                          temp_download = Math.max(temp_download, relative_index + 1);
                          await tryD();
                          async function tryD() {
                            if (forceStop) return;
                            try {
                              let config = await downloadElement(aid, bid, Number(index), Number(workerId));
                              temp_array.push(config);
                              temp_array = lodash.sortBy(temp_array, ['index']);
                              setFileList(temp_array);
                              currentDownloads--;
                              downloadsList[workerId] = false;
                              setDownloadCountCurrent(++temp_downloaded);
                              temp_downloaded >= downloadCountTotalSelectedCount && setDownloadFinished(true);
                              if (stop && temp_downloaded >= temp_download) {
                                setDownloadFinished(true);
                                stop = true;
                              }
                            } catch (error) {
                              if (typeof unsafeWindow != 'undefined') unsafeWindow.alert('下载出错:' + error);
                              // await tryD();
                            } finally {
                            }
                          }
                        })();
                      }
                    }
                  }}>
                  {downloadFinished ? '下载' : '停止'}
                </Button>
                <Button
                  variant='contained'
                  className='text-nowrap !rounded-lg'
                  onClick={async () => {
                    stop = true;
                    forceStop = true;
                    setDownloadFinished(true);
                  }}>
                  强制停止
                </Button>
              </div>
              <div className='px-2'>
                <Slider
                  min={1}
                  max={downloadCountTotal}
                  step={1}
                  value={downloadCountTotalSelected}
                  onChange={(e: any) => {
                    setDownloadCountTotalSelected(e.target.value);
                  }}
                  valueLabelDisplay='auto'
                />
              </div>
            </div>
            <div className='flex flex-col gap-4'>
              <TextField
                label='下载线程'
                variant='standard'
                value={MAX_CONCURRENT_DOWNLOADS}
                onChange={e => {
                  let thread = Number(e.target.value);
                  if (thread === 0) {
                    setMAX_CONCURRENT_DOWNLOADS(thread);
                    return;
                  }

                  if (isNaN(thread) || thread < 1) thread = 1;
                  if (thread > 32) thread = 32;
                  setMAX_CONCURRENT_DOWNLOADS(thread);
                  setItemValue('browser/MAX_CONCURRENT_DOWNLOADS', thread);
                  let currentDownloadsPercent: number[] = [];
                  for (let i = 0; i < thread; i++) {
                    currentDownloadsPercent[i] = 0;
                  }
                  setDownloadProgress(currentDownloadsPercent);
                }}
              />
              <div className='flex items-baseline gap-1'>
                <TextField
                  label='下载范围'
                  variant='standard'
                  value={downloadCountTotalSelected[0]}
                  onChange={e => {
                    let range = Math.min(Number(e.target.value), downloadCountTotal);
                    if (isNaN(range) || range < 0) range = 1;
                    setDownloadCountTotalSelected([range, downloadCountTotalSelected[1]]);
                  }}
                />
                {'-'}
                <TextField
                  label=' '
                  variant='standard'
                  value={downloadCountTotalSelected[1]}
                  onChange={e => {
                    let range = Math.min(Number(e.target.value), downloadCountTotal);
                    if (isNaN(range) || range < 0) range = 1;
                    setDownloadCountTotalSelected([downloadCountTotalSelected[0], range]);
                  }}
                />
              </div>
            </div>
          </div>
          <Download
            fileList={fileList}
            title={title}
            downloadProgress={downloadProgress}
            downloadCountCurrent={downloadCountCurrent}
            downloadCountTotal={downloadCountTotal}
            downloadCountTotal_length={downloadCountTotal_length}
            downloadCountTotalSelected={downloadCountTotalSelectedCount}
            downloadFinished={downloadFinished}
            downloadOptionSelected={downloadOptionSelected}
            setDownloadOptionSelected={setDownloadOptionSelected}></Download>
        </>
      )}
    </div>
  );
}
