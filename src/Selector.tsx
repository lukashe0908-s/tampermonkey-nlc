import { useEffect, useState, useMemo } from 'react';
import { Tab, Tabs, Box } from '@mui/material';
import Browser from './Browser/App';
import Gopeed from './Gopeed/App';
import GopeedSettings from './Gopeed/Settings';

export default function DownloaderSelector() {
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (typeof GM_getValue === 'function' && GM_getValue('defaultTab')!) setTabValue(GM_getValue('defaultTab'));
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (typeof GM_setValue === 'function') GM_setValue('defaultTab', newValue);
  };

  return (
    <>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label='浏览器下载' className='!normal-case' />
          <Tab label='Gopeed 下载' className='!normal-case' />
          <Tab label='Gopeed 下载设置' className='!normal-case' />
        </Tabs>
      </Box>
      <CustomTabPanel value={tabValue} index={0}>
        <Browser></Browser>
      </CustomTabPanel>
      <CustomTabPanel value={tabValue} index={1}>
        <Gopeed></Gopeed>
      </CustomTabPanel>
      <CustomTabPanel value={tabValue} index={2}>
        <GopeedSettings></GopeedSettings>
      </CustomTabPanel>
    </>
  );
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div role='tabpanel' hidden={value !== index} data-index={index} {...other}>
      {value === index && <>{children}</>}
    </div>
  );
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
