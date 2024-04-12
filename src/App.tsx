import { useEffect, useState, useMemo } from 'react';
import { Button, Skeleton, TextField, Slider } from '@mui/material';
import axios from 'axios';
import lodash from 'lodash';
import { fileConfig, downloadFile } from './util';
import { Download } from './Download';

let stop = false;

export default function App() {
  // let domain = 'http://localhost:12100/http://read.nlc.cn';
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
    return Math.max(downloadCountTotalSelected[1], 1) - Math.max(downloadCountTotalSelected[0], 1) + 1;
  }, [downloadCountTotalSelected]);
  const [downloadOptionSelected, setDownloadOptionSelected] = useState(0);
  useEffect(() => {
    setDownloadCountTotalSelected([1, downloadCountTotal]);
  }, [downloadCountTotal]);
  useEffect(() => {
    (async () => {
      let url = domain + window.location.href.replace(/https?:\/\/[^/]*?\//, '/');
      console.log(url);
      const html = await (
        await fetch(url, {
          referrerPolicy: 'no-referrer',
        })
      ).text();
      let parser = new DOMParser();
      let html_parased = parser.parseFromString(html, 'text/html');
      let roll_list = [...html.matchAll(/"\/OutOpenBook\/OpenObjectBook\?aid=([0-9]*?)&bid=([0-9.]*)/g)];
      roll_list = lodash.uniqWith(roll_list, lodash.isEqual);
      setRollList(roll_list as unknown as string[]);
      setDownloadCountTotal(roll_list.length);
      setTitle(html_parased.querySelector('.Z_clearfix .title')?.innerHTML.trim()!);
      setLoading(false);
    })();
    if (typeof GM_getValue === 'function' && GM_getValue('MAX_CONCURRENT_DOWNLOADS')!)
      setMAX_CONCURRENT_DOWNLOADS(GM_getValue('MAX_CONCURRENT_DOWNLOADS')!);
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
      ) : (
        <>
          <div className='flex gap-2 items-center'>
            <div className='flex flex-col pt-3 gap-4 w-full'>
              <Button
                variant='contained'
                className='text-nowrap !rounded-lg'
                disabled={!downloadFinished && stop}
                onClick={async () => {
                  if (!downloadFinished) {
                    stop = true;
                    return;
                  }
                  stop = false;
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
                        referrerPolicy: 'no-referrer',
                      })
                    ).text();
                    let tokenKey = token_page.match(/tokenKey="([^"]*?)"/)![1];
                    let timeKey = token_page.match(/timeKey="([^"]*?)"/)![1];
                    let timeFlag = token_page.match(/timeFlag="([^"]*?)"/)![1];
                    let config = {
                      index: index,
                      url: `${domain}/menhu/OutOpenBook/getReader?aid=${aid}&bid=${bid}&kime=${timeKey}&fime=${timeFlag}`,
                      token: tokenKey,
                      content: undefined as unknown as Blob,
                      size: 0,
                    };

                    let content = await getBlob();
                    async function getBlob(): Promise<Blob> {
                      return new Promise(async (resolve, reject) => {
                        axios
                          .get(config.url, {
                            headers: {
                              myreader: config.token,
                              // Referer: 'http://read.nlc.cn/static/webpdf/lib/WebPDFJRWorker.js',
                            },
                            responseType: 'blob',
                            onDownloadProgress: progressEvent => {
                              // console.log(progressEvent);
                              let percentCompleted = progressEvent.progress! * 100;
                              currentDownloadsPercent[workerId] = percentCompleted;
                              setDownloadProgress([...currentDownloadsPercent]);
                            },
                          })
                          .then(res => {
                            const { data, headers } = res;
                            const blob = new Blob([data], { type: headers['content-type'] });
                            resolve(blob);
                          })
                          .catch(e => {
                            reject(e);
                          });
                      });
                    }
                    if (content.size === 0) throw new Error(`下载失败,返回空 (index: ${index}) (workerId: ${workerId})`);
                    config.size = content.size;
                    if (downloadOptionSelected === 0 || downloadOptionSelected === 1) {
                      config.content = content;
                    }
                    if (downloadOptionSelected === 1 || downloadOptionSelected === 2) {
                      downloadFile(content, index, title, 'pdf', !(downloadCountTotal === 1), downloadCountTotal_length);
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
                      let index = Number(key);
                      const element = rollList_filter[key];
                      let aid = element[1];
                      let bid = element[2];
                      // 控制同时下载的数量
                      // eslint-disable-next-line no-loop-func
                      (async () => {
                        if (currentDownloads >= MAX_CONCURRENT_DOWNLOADS) await waitForDownloadCompletion(index);
                        if (stop) return;
                        currentDownloads++;
                        const workerId = lodash.findKey(downloadsList, function (o) {
                          return o === false;
                        })!;
                        downloadsList[workerId] = true;
                        await tryD();
                        async function tryD() {
                          try {
                            temp_download = Math.max(temp_download, index + 1);
                            let config = await downloadElement(aid, bid, index, Number(workerId));
                            temp_array.push(config);
                            temp_array = lodash.sortBy(temp_array, ['index']);
                            setFileList(temp_array);
                            currentDownloads--;
                            downloadsList[workerId] = false;
                            setDownloadCountCurrent(++temp_downloaded);
                            temp_downloaded >= downloadCountTotalSelectedCount && setDownloadFinished(true);
                            if (stop && temp_downloaded >= temp_download) {
                              setDownloadFinished(true);
                            }
                          } catch (error) {
                            // console.error('下载出错:', error);
                            await tryD();
                          } finally {
                          }
                        }
                      })();
                    }
                  }
                }}
              >
                {downloadFinished ? '下载' : '停止'}
              </Button>
              <div className='px-4'>
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
                  if (thread > 256) thread = 256;
                  setMAX_CONCURRENT_DOWNLOADS(thread);
                  if (typeof GM_setValue === 'function') GM_setValue('MAX_CONCURRENT_DOWNLOADS', thread);
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
            setDownloadOptionSelected={setDownloadOptionSelected}
          ></Download>
        </>
      )}
    </div>
  );
}
