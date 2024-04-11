import { useEffect, useState } from 'react';
import { Button, Box, LinearProgress, Skeleton, TextField } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import axios from 'axios';
import loadsh from 'lodash';
interface fileConfig {
  index: number;
  url: string;
  token: string;
  content: Blob;
  size: number;
}
declare function GM_getValue(name: string): any;
declare function GM_setValue(name: string, value: any): void;

export default function App() {
  let domain = 'http://read.nlc.cn';
  const [MAX_CONCURRENT_DOWNLOADS, setMAX_CONCURRENT_DOWNLOADS] = useState(4);
  const [rollList, setRollList] = useState([] as string[]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [fileList, setFileList] = useState([] as fileConfig[]);
  const [downloadFinished, setDownloadFinished] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState([0] as number[]);
  const [downloadCountCurrent, setDownloadCountCurrent] = useState(0);
  const [downloadCountTotal, setDownloadCountTotal] = useState(0);
  const [downloadCountTotal_length, setDownloadCountTotal_length] = useState(0);
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
      let roll_list = [...html.matchAll(/"\/OutOpenBook\/OpenObjectBook\?aid=([0-9]*?)&bid=([0-9.]*?)"/g)];
      roll_list = loadsh.uniqWith(roll_list, loadsh.isEqual);
      setRollList(roll_list as unknown as string[]);
      setDownloadCountTotal(roll_list.length);
      setDownloadCountTotal_length(Math.max(roll_list.length.toString().length, 2));
      setTitle(html_parased.querySelector('.Z_clearfix .title')?.innerHTML.trim()!);
      setLoading(false);
    })();
    if (typeof GM_getValue === 'function' && GM_getValue('MAX_CONCURRENT_DOWNLOADS'))
      setMAX_CONCURRENT_DOWNLOADS(GM_getValue('MAX_CONCURRENT_DOWNLOADS'));
  }, []);

  return (
    <div className='px-1 py-4 flex flex-col gap-4 !text-[16px]'>
      {loading ? (
        <Skeleton animation='wave' className='!h-[10em] !transform-none !rounded-[1em]' />
      ) : (
        <>
          <div className='flex gap-1'>
            <Button
              variant='contained'
              className='w-full text-nowrap !rounded-lg'
              disabled={!downloadFinished}
              onClick={async () => {
                setFileList([]);
                setDownloadFinished(false);
                setDownloadCountCurrent(0);
                async function downloadElement(aid: string, bid: string, index: number, workerId: number) {
                  currentDownloadsPercent[workerId] = 0;
                  setDownloadProgress(currentDownloadsPercent);
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
                            setDownloadProgress(currentDownloadsPercent);
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
                  config.content = content;
                  return config;
                }
                async function waitForDownloadCompletion() {
                  return new Promise(resolve => {
                    const checkCompletion = setInterval(() => {
                      if (currentDownloads < MAX_CONCURRENT_DOWNLOADS) {
                        clearInterval(checkCompletion);
                        resolve(undefined);
                      }
                    }, 10);
                  });
                }

                let temp_array: any[] = [];
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
                setDownloadProgress(currentDownloadsPercent);
                for (const key in rollList) {
                  if (Object.prototype.hasOwnProperty.call(rollList, key)) {
                    const element = rollList[key];
                    let aid = element[1];
                    let bid = element[2];
                    // 控制同时下载的数量
                    // eslint-disable-next-line no-loop-func
                    (async () => {
                      if (currentDownloads >= MAX_CONCURRENT_DOWNLOADS) await waitForDownloadCompletion();
                      currentDownloads++;
                      const workerId = loadsh.findKey(downloadsList, function (o) {
                        return o === false;
                      })!;
                      downloadsList[workerId] = true;
                      await tryD();
                      async function tryD() {
                        try {
                          let config = await downloadElement(aid, bid, Number(key), Number(workerId));
                          temp_array.push(config);
                          temp_array = loadsh.sortBy(temp_array, ['index']);
                          setFileList(temp_array);
                          currentDownloads--;
                          downloadsList[workerId] = false;
                          setDownloadCountCurrent(++temp_downloaded);
                          temp_downloaded === downloadCountTotal && setDownloadFinished(true);
                        } catch (error) {
                          console.error('下载出错:', error);
                          await tryD();
                        } finally {
                        }
                      }
                    })();
                  }
                }
              }}
            >
              下载
            </Button>
            <TextField
              label='最大下载线程'
              variant='outlined'
              value={MAX_CONCURRENT_DOWNLOADS}
              onChange={e => {
                setMAX_CONCURRENT_DOWNLOADS(Number(e.target.value));
                if (typeof GM_setValue === 'function') GM_setValue('MAX_CONCURRENT_DOWNLOADS', Number(e.target.value));
              }}
            />
          </div>
          <div className='flex items-center gap-4'>
            <div className='flex gap-[2px] w-full'>
              {downloadProgress.map((value, index) => {
                return (
                  <LinearProgress
                    color='primary'
                    variant='determinate'
                    value={value}
                    key={index}
                    className={`w-full first:!rounded-l-full last:!rounded-r-full`}
                  ></LinearProgress>
                );
              })}
            </div>
            <div>
              {downloadCountCurrent}/{downloadCountTotal}
            </div>
          </div>
          <Box
            component='section'
            className={`!rounded-lg border-2 p-2 ${
              downloadFinished ? 'border-green-400' : 'border-yellow-400'
            } border-dashed flex gap-1 flex-wrap max-h-[16em] overflow-auto transition-all`}
          >
            <Button
              variant='outlined'
              className='w-full !rounded-lg'
              onClick={() => {
                (async () => {
                  for (let index = 0; index < fileList.length; index++) {
                    const element = fileList[index];
                    downloadFile(element, title, downloadCountTotal_length);
                    await (async () => {
                      return new Promise(resolve => {
                        setTimeout(() => {
                          resolve(undefined);
                        }, 100);
                      });
                    })();
                  }
                })();
              }}
            >
              <FileDownloadIcon></FileDownloadIcon>
              全部下载到本地
            </Button>
            {fileList.map(value => {
              return (
                <Button
                  className='border-blue-400 cursor-pointer !rounded-lg'
                  key={value.index}
                  onClick={() => {
                    downloadFile(value, title, downloadCountTotal_length);
                  }}
                >
                  {title}/{(value.index + 1).toString().padStart(downloadCountTotal_length, '0')}&ensp;{formatFileSize(value.size)}
                </Button>
              );
            })}
          </Box>
        </>
      )}
    </div>
  );
}
function downloadFile(value: fileConfig, title: string, padTo: number = 4) {
  let object_ = URL.createObjectURL(value.content);
  const ele = document.createElement('a');
  ele.href = object_;
  ele.download = `${title}/${(value.index + 1).toString().padStart(padTo, '0')}.pdf`;
  ele.click();
  // window.URL.revokeObjectURL(object_);
}

function formatFileSize(fileSize: number) {
  if (fileSize < 1024) {
    return fileSize + 'B';
  } else if (fileSize < 1024 * 1024) {
    let temp: any = fileSize / 1024;
    temp = temp.toFixed(2);
    return temp + 'KB';
  } else if (fileSize < 1024 * 1024 * 1024) {
    let temp: any = fileSize / (1024 * 1024);
    temp = temp.toFixed(2);
    return temp + 'MB';
  } else {
    let temp: any = fileSize / (1024 * 1024 * 1024);
    temp = temp.toFixed(2);
    return temp + 'GB';
  }
}
