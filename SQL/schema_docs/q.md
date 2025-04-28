-- Function: public.update_benhnhanfake_datlich()

-- DROP FUNCTION public.update_benhnhanfake_datlich();

CREATE OR REPLACE FUNCTION public.update_benhnhanfake_datlich()
  RETURNS void AS
$BODY$
DECLARE
  record RECORD;
BEGIN
 CREATE TEMP TABLE Tb_PatientIdFake AS
 SELECT * FROM (VALUES
    (1515788::Integer),(1515789::Integer),(1515712::Integer),(1515790::Integer),(1515791::Integer),(1515792::Integer),(1515713::Integer),(1515794::Integer),(1515795::Integer),(1515796::Integer),(1515736::Integer),(1515737::Integer),(1515738::Integer),(1515797::Integer),(1515798::Integer),(1515799::Integer),(1515739::Integer),(1515800::Integer),(1515801::Integer),(1515802::Integer),(1515714::Integer),(1515740::Integer),(1515741::Integer),(1515742::Integer),(1515744::Integer),(1515745::Integer),(1515746::Integer),(1515747::Integer),(1515748::Integer),(1515749::Integer),(1515803::Integer),(1515715::Integer),(1515804::Integer),(1515805::Integer),(1515806::Integer),(1515716::Integer),(1515808::Integer),(1515809::Integer),(1515810::Integer),(1515811::Integer),(1515812::Integer),(1515717::Integer),(1515750::Integer),(1515813::Integer),(1515751::Integer),(1515637::Integer),(1515718::Integer),(1515814::Integer),(1515752::Integer),(1515753::Integer),(1515816::Integer),(1515754::Integer),(1515755::Integer),(1515756::Integer),(1515757::Integer),(1515758::Integer),(1515759::Integer),(1515760::Integer),(1515817::Integer),(1515818::Integer),(1515819::Integer),(1515820::Integer),(1515821::Integer),(1515824::Integer),(1515761::Integer),(1515762::Integer),(1515763::Integer),(1515764::Integer),(1515765::Integer),(1515766::Integer),(1515719::Integer),(1515720::Integer),(1515825::Integer),(1515721::Integer),(1515722::Integer),(1515723::Integer),(1515767::Integer),(1515724::Integer),(1515827::Integer),(1515726::Integer),(1515729::Integer),(1515730::Integer),(1515731::Integer),(1515732::Integer),(1515665::Integer),(1515733::Integer),(1515768::Integer),(1515769::Integer),(1515771::Integer),(1515669::Integer),(1515671::Integer),(1515674::Integer),(1515677::Integer),(1515679::Integer),(1515822::Integer),(1515680::Integer),(1515734::Integer),(1515772::Integer),(1515773::Integer),(1515774::Integer),(1515681::Integer),(1515775::Integer),(1515776::Integer),(1515735::Integer),(1515682::Integer),(1515683::Integer),(1515777::Integer),(1515684::Integer),(1515687::Integer),(1515688::Integer),(1515689::Integer),(1515690::Integer),(1515691::Integer),(1515692::Integer),(1515693::Integer),(1515779::Integer),(1515780::Integer),(1515695::Integer),(1515696::Integer),(1515697::Integer),(1515781::Integer),(1515782::Integer),(1515783::Integer),(1515698::Integer),(1515784::Integer),(1515699::Integer),(1515785::Integer),(1515700::Integer),(1515701::Integer),(1515702::Integer),(1515704::Integer),(1515705::Integer),(1515706::Integer),(1515707::Integer),(1515708::Integer),(1515709::Integer),(1515786::Integer),(1515710::Integer),(1515711::Integer),(1515787::Integer),(1515832::Integer),(1515833::Integer),(1515834::Integer),(1515835::Integer),(1515836::Integer),(1515838::Integer),(1515839::Integer),(1515840::Integer),(1515841::Integer),(1515856::Integer),(1516056::Integer),(1515857::Integer),(1515858::Integer),(1515859::Integer),(1515860::Integer),(1515861::Integer),(1515862::Integer),(1515863::Integer),(1515864::Integer),(1515865::Integer),(1515866::Integer),(1515867::Integer),(1515868::Integer),(1515869::Integer),(1515870::Integer),(1515871::Integer),(1515872::Integer),(1515873::Integer),(1515874::Integer),(1515875::Integer),(1515876::Integer),(1515877::Integer),(1515878::Integer),(1515879::Integer),(1515880::Integer),(1515881::Integer),(1515882::Integer),(1515883::Integer),(1515884::Integer),(1515885::Integer),(1515886::Integer),(1515887::Integer),(1515888::Integer),(1515889::Integer),(1515890::Integer),(1515891::Integer),(1515892::Integer),(1515893::Integer),(1515894::Integer),(1515895::Integer),(1515896::Integer),(1515897::Integer),(1515898::Integer),(1515899::Integer),(1515900::Integer),(1515901::Integer),(1515902::Integer),(1515903::Integer),(1515904::Integer),(1515905::Integer),(1515906::Integer),(1515907::Integer),(1515908::Integer),(1515909::Integer),(1515910::Integer),(1515911::Integer),(1515912::Integer),(1515922::Integer),(1515938::Integer),(1515947::Integer),(1515997::Integer),(1516106::Integer),(1516107::Integer),(1516008::Integer),(1516115::Integer),(1515828::Integer),(1515829::Integer),(1515830::Integer),(1515831::Integer),(1516123::Integer),(1516145::Integer),(1516126::Integer),(1516186::Integer),(1516221::Integer),(1516232::Integer),(1516233::Integer),(1516238::Integer),(1516160::Integer),(1516166::Integer),(1516330::Integer),(1516282::Integer),(1516303::Integer),(1516264::Integer),(1516263::Integer),(1516336::Integer),(1516403::Integer),(1516332::Integer),(1516193::Integer),(1516192::Integer),(1516191::Integer),(1516190::Integer),(1516189::Integer),(1516188::Integer),(1516187::Integer),(1516410::Integer),(1516409::Integer),(1516408::Integer),(1516407::Integer),(1516406::Integer),(1516405::Integer),(1516404::Integer),(1516402::Integer),(1516401::Integer),(1516399::Integer),(1516398::Integer),(1516397::Integer),(1516396::Integer),(1516395::Integer),(1516394::Integer),(1516393::Integer),(1516392::Integer),(1516391::Integer),(1516390::Integer),(1516388::Integer),(1516387::Integer),(1516386::Integer),(1516385::Integer),(1516384::Integer),(1516383::Integer),(1516382::Integer),(1516380::Integer),(1516379::Integer),(1516377::Integer),(1516376::Integer),(1516375::Integer),(1516374::Integer),(1516373::Integer),(1516372::Integer),(1516370::Integer),(1516369::Integer),(1516368::Integer),(1516367::Integer),(1516366::Integer),(1516365::Integer),(1516364::Integer),(1516363::Integer),(1516362::Integer),(1516185::Integer),(1516361::Integer),(1516360::Integer),(1516359::Integer),(1516358::Integer),(1516357::Integer),(1516355::Integer),(1516354::Integer),(1516353::Integer),(1516352::Integer),(1516351::Integer),(1516350::Integer),(1516349::Integer),(1515608::Integer),(1515613::Integer),(1515998::Integer),(1516329::Integer),(1516328::Integer),(1516326::Integer),(1516325::Integer),(1516324::Integer),(1516322::Integer),(1516321::Integer),(1516320::Integer),(1516319::Integer),(1516318::Integer),(1516317::Integer),(1516316::Integer),(1516315::Integer),(1516314::Integer),(1516313::Integer),(1516312::Integer),(1516311::Integer),(1516310::Integer),(1516309::Integer),(1516308::Integer),(1516184::Integer),(1516291::Integer),(1516290::Integer),(1516289::Integer),(1516287::Integer),(1516286::Integer),(1516285::Integer),(1516284::Integer),(1516283::Integer),(1516281::Integer),(1516280::Integer),(1516279::Integer),(1516278::Integer),(1516277::Integer),(1516276::Integer),(1516275::Integer),(1516274::Integer),(1516273::Integer),(1516272::Integer),(1516271::Integer),(1516270::Integer),(1516269::Integer),(1516268::Integer),(1516267::Integer),(1516266::Integer),(1516265::Integer),(1516262::Integer),(1516261::Integer),(1516260::Integer),(1516259::Integer),(1516258::Integer),(1516345::Integer),(1516257::Integer),(1516378::Integer),(1516256::Integer),(1516255::Integer),(1516253::Integer),(1516252::Integer),(1516251::Integer),(1516250::Integer),(1516248::Integer),(1516247::Integer),(1516246::Integer),(1516244::Integer),(1516242::Integer),(1516240::Integer),(1516239::Integer),(1516237::Integer),(1516236::Integer),(1516235::Integer),(1516234::Integer),(1516231::Integer),(1516230::Integer),(1516228::Integer),(1516227::Integer),(1516226::Integer),(1516225::Integer),(1516224::Integer),(1516223::Integer),(1516222::Integer),(1516220::Integer),(1516219::Integer),(1516218::Integer),(1516217::Integer),(1516216::Integer),(1516214::Integer),(1516213::Integer),(1516212::Integer),(1516211::Integer),(1516209::Integer),(1516208::Integer),(1516207::Integer),(1516206::Integer),(1516205::Integer),(1516204::Integer),(1516203::Integer),(1516202::Integer),(1516200::Integer),(1516199::Integer),(1516198::Integer),(1516197::Integer),(1516195::Integer),(1516194::Integer),(1516348::Integer),(1516347::Integer),(1516346::Integer),(1516344::Integer),(1516343::Integer),(1516342::Integer),(1516341::Integer),(1516241::Integer),(1516340::Integer),(1516338::Integer),(1516337::Integer),(1516334::Integer),(1516333::Integer),(1516183::Integer),(1516182::Integer),(1516181::Integer),(1516180::Integer),(1516179::Integer),(1516178::Integer),(1516177::Integer),(1516171::Integer),(1516170::Integer),(1516125::Integer),(1516307::Integer),(1516306::Integer),(1516305::Integer),(1516304::Integer),(1516301::Integer),(1516300::Integer),(1516299::Integer),(1516298::Integer),(1516297::Integer),(1516138::Integer),(1516116::Integer),(1516117::Integer),(1516118::Integer),(1516119::Integer),(1516120::Integer),(1516121::Integer),(1516124::Integer),(1516292::Integer),(1516293::Integer),(1516294::Integer),(1516295::Integer),(1516296::Integer),(1516172::Integer),(1516173::Integer),(1516174::Integer),(1516175::Integer),(1516176::Integer),(1515842::Integer),(1515843::Integer),(1515844::Integer),(1515845::Integer),(1515846::Integer),(1515848::Integer),(1515849::Integer),(1515850::Integer),(1515851::Integer),(1515852::Integer),(1515853::Integer),(1516127::Integer),(1516128::Integer),(1516139::Integer),(1516140::Integer),(1516141::Integer),(1516143::Integer),(1516144::Integer),(1516146::Integer),(1516147::Integer),(1516148::Integer),(1516150::Integer),(1516151::Integer),(1516153::Integer),(1516154::Integer),(1516155::Integer),(1516156::Integer),(1516096::Integer),(1516114::Integer),(1516137::Integer),(1516136::Integer),(1516135::Integer),(1516134::Integer),(1516133::Integer),(1516131::Integer),(1516130::Integer),(1516129::Integer),(1516169::Integer),(1516158::Integer),(1516157::Integer),(1516021::Integer),(1516020::Integer),(1516078::Integer),(1516077::Integer),(1516076::Integer),(1516071::Integer),(1516070::Integer),(1516067::Integer),(1516066::Integer),(1516069::Integer),(1516065::Integer),(1516064::Integer),(1516061::Integer),(1516060::Integer),(1516057::Integer),(1516053::Integer),(1516052::Integer),(1516051::Integer),(1516049::Integer),(1516047::Integer),(1516045::Integer),(1516044::Integer),(1516001::Integer),(1516000::Integer),(1515999::Integer),(1515996::Integer),(1515994::Integer),(1515993::Integer),(1515992::Integer),(1515991::Integer),(1515990::Integer),(1515989::Integer),(1515988::Integer),(1515987::Integer),(1515986::Integer),(1515983::Integer),(1515985::Integer),(1515984::Integer),(1515982::Integer),(1515981::Integer),(1515980::Integer),(1515979::Integer),(1515977::Integer),(1515978::Integer),(1515976::Integer),(1515975::Integer),(1515974::Integer),(1515973::Integer),(1515972::Integer),(1515970::Integer),(1515969::Integer),(1515971::Integer),(1515968::Integer),(1515967::Integer),(1515966::Integer),(1515965::Integer),(1515964::Integer),(1515963::Integer),(1515962::Integer),(1515961::Integer),(1515960::Integer),(1515959::Integer),(1515958::Integer),(1515957::Integer),(1515956::Integer),(1515955::Integer),(1515954::Integer),(1515953::Integer),(1515952::Integer),(1515951::Integer),(1515950::Integer),(1515949::Integer),(1515946::Integer),(1515944::Integer),(1515943::Integer),(1515945::Integer),(1515942::Integer),(1515941::Integer),(1515940::Integer),(1515939::Integer),(1515937::Integer),(1515935::Integer),(1515934::Integer),(1515933::Integer),(1515932::Integer),(1515931::Integer),(1515930::Integer),(1515929::Integer),(1515925::Integer),(1515924::Integer),(1515921::Integer),(1515920::Integer),(1515919::Integer),(1515917::Integer),(1515916::Integer),(1515913::Integer),(1515855::Integer),(1515854::Integer),(1516105::Integer),(1516063::Integer),(1516062::Integer),(1516055::Integer),(1516054::Integer),(1516075::Integer),(1516074::Integer),(1516073::Integer),(1516072::Integer),(1516081::Integer),(1516101::Integer),(1516099::Integer),(1516098::Integer),(1516041::Integer),(1516040::Integer),(1516039::Integer),(1516068::Integer),(1516043::Integer),(1515928::Integer),(1515926::Integer),(1515915::Integer),(1516164::Integer),(1516168::Integer),(1516162::Integer),(1516159::Integer),(1515927::Integer),(1515914::Integer),(1515918::Integer),(1516059::Integer),(1516026::Integer),(1516025::Integer),(1516024::Integer),(1516023::Integer),(1516022::Integer),(1516027::Integer),(1516038::Integer),(1516037::Integer),(1516036::Integer),(1516035::Integer),(1516034::Integer),(1516033::Integer),(1516032::Integer),(1516031::Integer),(1516030::Integer),(1516029::Integer),(1516028::Integer),(1516042::Integer),(1516080::Integer),(1516079::Integer),(1516103::Integer),(1516102::Integer),(1516095::Integer),(1516094::Integer),(1516093::Integer),(1516092::Integer),(1516091::Integer),(1516089::Integer),(1516088::Integer),(1516090::Integer),(1516087::Integer),(1516086::Integer),(1516085::Integer),(1516084::Integer),(1516083::Integer),(1516082::Integer),(1516109::Integer),(1516110::Integer),(1516111::Integer),(1516112::Integer),(1516113::Integer),(1516019::Integer),(1516018::Integer),(1516017::Integer),(1516016::Integer),(1516014::Integer),(1516013::Integer),(1516012::Integer),(1516011::Integer),(1516010::Integer),(1516009::Integer),(1516007::Integer),(1516006::Integer),(1516005::Integer),(1516004::Integer),(1516003::Integer),(1516002::Integer)
  ) AS t(patientidFake);

 -- Cập nhật bảng hosobenhan lại tên 
    UPDATE hosobenhan 
    SET patientname = 'BenhNhanFake'
    WHERE patientid IN (
        SELECT patientid 
        FROM sothutuphongkham 
        WHERE departmentid IN (1118,1119,1120,1121,1122,1123,1124,1125,1126,1127,1128)
    ) 
    AND patientid IN (SELECT patientidFake FROM Tb_PatientIdFake);

    -- Cập nhật bảng patient lại tên 
    UPDATE patient 
    SET patientname = 'BenhNhanFake'
    WHERE patientid IN (
        SELECT patientid 
        FROM sothutuphongkham 
        WHERE departmentid IN (1118,1119,1120,1121,1122,1123,1124,1125,1126,1127,1128)
    ) 
    AND patientid IN (SELECT patientidFake FROM Tb_PatientIdFake);

    -- Cập nhật bảng sothutuphongkham về PK test, ngày 19/07/2024
    UPDATE sothutuphongkham 
    SET departmentid = 927,
        sothutudate = '2024-07-19 06:00:00',
        sothutustatus = 0 
    WHERE departmentid IN (1118,1119,1120,1121,1122,1123,1124,1125,1126,1127,1128)
    AND patientid IN (SELECT patientidFake FROM Tb_PatientIdFake);

    FOR record IN
        WITH DanhSachDatLich AS (
            SELECT p.patientid, p.patientname, p.birthday, d.departmentid, d.departmentname, dkk.dangkykhamnumber,dkk.dangkykhamstatus,
            CASE 
                WHEN d.departmentid = 8 THEN 1119
                WHEN d.departmentid = 392 THEN 1120
                WHEN d.departmentid = 1095 THEN 1121
                WHEN d.departmentid = 632 THEN 1122
                WHEN d.departmentid = 14 THEN 1123
                WHEN d.departmentid = 408 THEN 1124
                WHEN d.departmentid = 909 THEN 1118
                WHEN d.departmentid = 16 THEN 1125
                WHEN d.departmentid = 554 THEN 1126
                WHEN d.departmentid = 556 THEN 1127
                WHEN d.departmentid = 849 THEN 1128
                ELSE 0 
            END AS departmentfakeid
            FROM dangkykham dkk
            JOIN patient p ON dkk.patientid = p.patientid
            JOIN department d ON dkk.departmentid = d.departmentid
            WHERE dkk.dangkykhamdate::date = current_date::date
            AND dkk.departmentid IN (8, 392, 1095, 632, 14, 408, 909, 16, 554, 556, 849)
            ORDER BY d.departmentid
        ),
        t1 AS (
            SELECT row_number() OVER () AS rn, DanhSachDatLich.*
            FROM DanhSachDatLich
        ),
        DanhSachPatientIdFake AS (
            SELECT patientid AS patientfakeid 
            FROM sothutuphongkham 
            WHERE departmentid = 927 
            AND sothutudate::date = '2024-07-19'
            AND patientid IN (SELECT patientidFake FROM Tb_PatientIdFake)
            LIMIT (SELECT COUNT(*) FROM DanhSachDatLich)
        ),
        t2 AS (
            SELECT row_number() OVER () AS rn, DanhSachPatientIdFake.*
            FROM DanhSachPatientIdFake
        ),
        t3 AS (
            SELECT t1.*, t2.*
            FROM t1
            JOIN t2 ON t1.rn = t2.rn
        )
        SELECT * FROM t3 where  dangkykhamstatus <2
    LOOP
        UPDATE hosobenhan 
        SET patientname = record.patientname, birthday = record.birthday
        WHERE patientid = record.patientfakeid;

        UPDATE patient 
        SET patientname = record.patientname
        WHERE patientid = record.patientfakeid;

        UPDATE sothutuphongkham 
        SET departmentid = record.departmentfakeid,
            sothutunumber = record.dangkykhamnumber,
            sothutudate = current_date::date,
            sothutustatus = 0 
        WHERE patientid = record.patientfakeid;
    END LOOP;
     -- Xóa bảng tạm sau khi hoàn thành
    DROP TABLE Tb_PatientIdFake;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
ALTER FUNCTION public.update_benhnhanfake_datlich()
  OWNER TO postgres;
